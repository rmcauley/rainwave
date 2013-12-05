import os
import psycopg2
import time
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.options

from rainwave import schedule
from rainwave import playlist
from libs import log
from libs import config
from libs import db
from libs import chuser
from libs import cache

sid_output = {}

class AdvanceScheduleRequest(tornado.web.RequestHandler):
	processed = False

	def get(self, sid):
		self.success = False
		self.sid = None
		if int(sid) in config.station_ids:
			self.sid = int(sid)
		else:
			return

		# We don't need to worry about any different situations here..
		# .. AS LONG AS WE ASSUME THE BACKEND TO BE SINGLE-THREADED...
		if cache.get_station(self.sid, "get_next_socket_timeout") and sid_output[self.sid]:
			log.warn("backend", "Using previous output to prevent flooding.")
			self.write(sid_output[self.sid])
			sid_output[self.sid] = None
			self.success = True
		else:
			try:
				schedule.advance_station(self.sid)
			except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
				logy.warn("backend", e.diag.message_primary)
				db.close()
				db.open()
				raise
			except psycopg2.extensions.TransactionRollbackError as e:
				log.warn("backend", "Database transaction deadlock.  Re-opening database and setting retry timeout.")
				db.close()
				db.open()
				raise

			to_send = None
			if not config.get("liquidsoap_annotations"):
				to_send = schedule.get_current_file(self.sid)
			else:
				to_send = self._get_annotated(schedule.get_current_event(self.sid))
			sid_output[self.sid] = to_send
			self.success = True
			if not cache.get_station(self.sid, "get_next_socket_timeout"):
				self.write(to_send)

	def _get_annotated(self, e):
		string = "annotate:crossfade=\""
		if e.use_crossfade:
			string += "1"
		else:
			string += "0"
		string += "\","

		string += "use_suffix=\""
		if e.use_tag_suffix:
			string += "1"
		else:
			string += "0"
		string += "\""

		string += ",suffix=\"%s\"" % config.get_station(self.sid, "stream_suffix")

		if e.name:
			string += ",title=\"%s\"" % event.name

		string += ":" + e.get_filename()
		return string

class RefreshScheduleRequest(tornado.web.RequestHandler):
	def get(self, sid):
		schedule.refresh_schedule(int(sid))

def start():
	db.open()
	cache.open()
	if config.test_mode:
		playlist.remove_all_locks(1)

	for sid in config.station_ids:
		sid_output[sid] = None

	app = tornado.web.Application([
		(r"/advance/([0-9]+)", AdvanceScheduleRequest),
		(r"/refresh/([0-9]+)", RefreshScheduleRequest)
		], debug=(config.test_mode or config.get("developer_mode")))

	server = tornado.httpserver.HTTPServer(app)
	server.listen(int(config.get("backend_port")), address='127.0.0.1')

	if config.get("backend_user") or config.get("backend_group"):
		chuser.change_user(config.get("backend_user"), config.get("backend_group"))

	pid = os.getpid()
	pidfile = open(config.get("backend_pid_file"), 'w')
	pidfile.write(str(pid))
	pidfile.close()

	schedule.load()

	for sid in config.station_ids:
		playlist.prepare_cooldown_algorithm(sid)

	log.debug("start", "Backend server bootstrapped, port %s, ready to go." % int(config.get("backend_port")))

	try:
		tornado.ioloop.IOLoop.instance().start()
	finally:
		db.close()
