import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.options

from rainwave import schedule
from libs import log
from libs import config
from libs import db

class AdvanceScheduleRequest(tornado.web.RequestHandler):
	def get(self, sid):
		self.sid = None
		if int(sid) in config.station_ids:
			self.sid = int(sid)
			schedule.advance_station(sid)
			self.write(schedule.get_current_file())
	
	def on_finish(self):
		if self.sid:
			schedule.post_process(self.sid)

def start():
	log.init(log_file, config.get("log_level"))
	log.debug("start", "Server booting, port %s." % port_no)
	db.open()
	
	app = tornado.web.Application([
		(r"/advance/([0-9]+)", AdvanceScheduleRequest)
		])
	
	server = tornado.httpserver.HTTPServer(app)
	server.listen(int(config.get("backend_port")), address='127.0.0.1')
	
	schedule.load()
	
	tornado.ioloop.IOLoop.instance().start()