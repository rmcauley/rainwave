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
				log.warn("backend", e.diag.message_primary)
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
				to_send = schedule.get_advancing_file(self.sid)
			else:
				to_send = self._get_annotated(schedule.get_advancing_event(self.sid))
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

		if hasattr(e, 'songs'):
			string += ",suffix=\"%s\"" % config.get_station(self.sid, "stream_suffix")
		elif e.name:
			string += ",title=\"%s\"" % e.name

		if hasattr(e, "replay_gain") and e.replay_gain:
			string += ",replay_gain=\"%s\"" % e.replay_gain

		string += ":" + e.get_filename()
		return string

# class RefreshScheduleRequest(tornado.web.RequestHandler):
# 	def get(self, sid):
# 		schedule.refresh_schedule(int(sid))

class BackendServer(object):
	def __init__(self):
		pid = os.getpid()
		pid_file = open(config.get("backend_pid_file"), 'w')
		pid_file.write(str(pid))
		pid_file.close()

	def _listen(self, sid):
		db.open()
		cache.open()
		log.init("%s/rw_%s.log" % (config.get("log_dir"), config.station_id_friendly[sid]), config.get("log_level"))

		if config.test_mode:
			playlist.remove_all_locks(sid)

		# (r"/refresh/([0-9]+)", RefreshScheduleRequest)
		app = tornado.web.Application([
			(r"/advance/([0-9]+)", AdvanceScheduleRequest),
			], debug=(config.test_mode or config.get("developer_mode")))

		server = tornado.httpserver.HTTPServer(app)
		server.listen(int(config.get("backend_port")) + sid, address='127.0.0.1')
		
		for station_id in config.station_ids:
			playlist.prepare_cooldown_algorithm(station_id)
		schedule.load()
		log.debug("start", "Backend server bootstrapped, station %s port %s, ready to go." % (config.station_id_friendly[sid], config.get("backend_port")))

		ioloop = tornado.ioloop.IOLoop.instance()
		try:
			ioloop.start()
		finally:
			ioloop.stop()
			http_server.stop()
			db.close()
			log.info("stop", "Backend has been shutdown.")
			log.close()

	def _import_cron_modules(self):
		import backend.api_key_pruning
		import backend.icecast_sync

	def start(self):
		for sid in config.station_ids:
			sid_output[sid] = None

		stations = list(config.station_ids)
		if not hasattr(os, "fork"):
			self._import_cron_modules()
			self._listen(stations[0])
		else:
			tornado.process.fork_processes(len(stations))

			task_id = tornado.process.task_id()
			if task_id == 0:
				self._import_cron_modules()
			if task_id != None:
				self._listen(stations[task_id])
