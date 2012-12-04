import os
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
	def get(self, sid):
		self.sid = None
		if int(sid) in config.station_ids:
			self.sid = int(sid)
			schedule.advance_station(self.sid)
			if not config.get("liquidsoap_annotations"):
				self.write(schedule.get_current_file(self.sid))
			else:
				self.write(self._get_annotated(schedule.get_current_event(self.sid)))
				
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
	
	def on_finish(self):
		if self.sid:
			schedule.post_process(self.sid)

def start():
	log.debug("start", "Server booting, port %s." % int(config.get("backend_port")))
	db.open()
	cache.open()
	playlist.remove_all_locks(1)		# DEBUG ONLY
	
	app = tornado.web.Application([
		(r"/advance/([0-9]+)", AdvanceScheduleRequest),
		], debug=config.get("debug_mode"))
	
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
	
	try:
		tornado.ioloop.IOLoop.instance().start()
	finally:
		db.close()