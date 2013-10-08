import os
import psycopg2
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

class AdvanceScheduleRequest(tornado.web.RequestHandler):
	retried = False
	processed = False

	def get(self, sid):
		self.success = False
		self.sid = None
		if int(sid) in config.station_ids:
			self.sid = int(sid)
		else:
			return

		try:
			schedule.advance_station(self.sid)
		except psycopg2.extensions.TransactionRollbackError as e:
			if not self.retried:
				self.retried = True
				log.warn("backend", "Database transaction deadlock.  Re-opening database and setting retry timeout.")
				db.close()
				db.open()
				tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(milliseconds=350), self.get)
			else:
				raise

		if not config.get("liquidsoap_annotations"):
			self.write(schedule.get_current_file(self.sid))
		else:
			self.write(self._get_annotated(schedule.get_current_event(self.sid)))
		self.success = True

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

	log.debug("start", "Backend server bootstrapped, port %s, ready to go." % int(config.get("backend_port")))

	for sid in config.station_ids:
		playlist.prepare_cooldown_algorithm(sid)

	try:
		tornado.ioloop.IOLoop.instance().start()
	finally:
		db.close()
