import os
import psycopg2
from time import time as timestamp
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.options

from backend import sync_to_front
from rainwave import schedule
from rainwave import playlist
from libs import log
from libs import config
from libs import db
from libs import cache
from libs import memory_trace

sid_output = {}

class AdvanceScheduleRequest(tornado.web.RequestHandler):
	processed = False

	def get(self, sid):	#pylint: disable=W0221
		self.success = False
		self.sid = None
		if int(sid) in config.station_ids:
			self.sid = int(sid)
		else:
			return

		if cache.get_station(self.sid, "backend_paused"):
			if not cache.get_station(self.sid, "dj_heartbeat_start"):
				log.debug("dj", "Setting server start heatbeat.")
				cache.set_station(self.sid, "dj_heartbeat_start", timestamp())
			self.write(self._get_pause_file())
			schedule.set_upnext_crossfade(self.sid, False)
			cache.set_station(self.sid, "backend_paused_playing", True)
			sync_to_front.sync_frontend_dj(self.sid)
			return
		else:
			cache.set_station(self.sid, "dj_heartbeat_start", False)
			cache.set_station(self.sid, "backend_paused", False)
			cache.set_station(self.sid, "backend_paused_playing", False)

		# This program must be run on 1 station for 1 instance, which would allow this operation to be safe.
		# Also works if 1 process is serving all stations.  Pinging any instance for any station
		# would break the program here, though.
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
				db.connect()
				raise
			except psycopg2.extensions.TransactionRollbackError as e:
				log.warn("backend", "Database transaction deadlock.  Re-opening database and setting retry timeout.")
				db.close()
				db.connect()
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

	def _get_pause_file(self):
		if not config.get("liquidsoap_annotations"):
			log.debug("backend", "Station is paused, using: %s" % config.get("pause_file"))
			return config.get("pause_file")

		string = "annotate:crossfade=\"2\",use_suffix=\"1\","
		if cache.get_station(self.sid, "pause_title"):
			string += "title=\"%s\"" % cache.get_station(self.sid, "pause_title")
		else:
			string += "title=\"Intermission\""
		string += ":" + config.get("pause_file")
		log.debug("backend", "Station is paused, using: %s" % string)
		return string

	def _get_annotated(self, e):
		string = "annotate:crossfade=\""
		if e.use_crossfade == True:
			string += "1"
		elif e.use_crossfade:
			string += e.use_crossfade
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
	def _listen(self, sid):
		pid = os.getpid()
		pid_file = open("%s/backend_%s.pid" % (config.get_directory("pid_dir"), config.station_id_friendly[sid].lower()), 'w')
		pid_file.write(str(pid))
		pid_file.close()

		db.connect()
		cache.connect()
		log.init("%s/rw_%s.log" % (config.get_directory("log_dir"), config.station_id_friendly[sid].lower()), config.get("log_level"))
		memory_trace.setup(config.station_id_friendly[sid].lower())

		if config.test_mode:
			playlist.remove_all_locks(sid)

		# (r"/refresh/([0-9]+)", RefreshScheduleRequest)
		app = tornado.web.Application([
			(r"/advance/([0-9]+)", AdvanceScheduleRequest),
			], debug=(config.test_mode or config.get("developer_mode")))

		port = int(config.get("backend_port")) + sid
		server = tornado.httpserver.HTTPServer(app)
		server.listen(port, address='127.0.0.1')

		for station_id in config.station_ids:
			playlist.prepare_cooldown_algorithm(station_id)
		schedule.load()
		log.debug("start", "Backend server started, station %s port %s, ready to go." % (config.station_id_friendly[sid], port))

		ioloop = tornado.ioloop.IOLoop.instance()
		try:
			ioloop.start()
		finally:
			ioloop.stop()
			server.stop()
			db.close()
			log.info("stop", "Backend has been shutdown.")
			log.close()

	def _import_cron_modules(self):
		#pylint: disable=W0612
		# This method breaks pylint and quite on purpose, its job is to just load
		# the cron jobs that run occasionally.  Ignore pylint warning W0612.
		import backend.api_key_pruning
		import backend.inactive
		import backend.dj_heartbeat
		#pylint: enable=W0612

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
