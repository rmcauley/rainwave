import tornado.web
import tornado.escape

from api.server import handle_url
from api.web import RequestHandler
from api.requests import info

from libs import config
from libs import cache
from libs import log
from libs import db
from rainwave.user import User

@handle_url("authtest")
class RequestHandler(tornado.web.RequestHandler):
	def prepare(self):
		self.info = []
	
		if "r4sid" in self.request.cookies:
			self.sid = int(self.get_cookie("r4sid"))
			if not self.sid in config.station_ids:
				self.sid = 1
		else
			self.sid = 1
			
		if self.request.host == "game.rainwave.cc":
			self.sid = 1
		elif self.request.host == "ocr.rainwave.cc":
			self.sid = 2
		elif self.request.host == "covers.rainwave.cc":
			self.sid = 3
		elif self.request.host == "chiptune.rainwave.cc":
			self.sid = 4
		elif self.request.host == "all.rainwave.cc":
			self.sid = 5
		
		self.set_cookie("r4sid", self.sid, expires_days=365, domain=".rainwave.cc")
	
		self.user = None
		if not "phpbb3_38ie8_u" in self.request.cookies:
			self.user = User(1)
		else:
			user_id = int(self.get_cookie("phpbb3_38ie8_u"))
			if "phpbb3_38ie8_sid" in self.request.cookies:
				# we can do session-based auth
				session = db.c.fetch_var("SELECT 1 FROM phpbb_sessions WHERE session_id = %s AND user_id = %s", (self.get_cookie("phpbb3_38ie8_sid"), user_id))
				if session == 1:
					db.c.update("UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s", (time.time(), "rainwave"), self.get_cookie("phpbb3_38ie8_sid"))
					self.user = User(user_id)
					self.user.authorize(self.sid, None, True)

			if not self.user and "phpbb3_38ie8_k" in self.request.cookies:
				can_login = db.c.fetch_var("SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s", (self.get_cookie("phpbb3_38ie8_k"), user_id))
				if can_login == 1:
					self.user = User(user_id)
					self.user.authorize(self.sid, None, True)

		if not self.user:
			self.user = User(1)
		
		self.user.ensure_api_key(self.request.remote_ip)
			
		self.user.data['sid'] = self.sid
		
	# this is so that get_info can be called, makes us compatible with the custom web handler used elsewhere in RW
	def append(self, key, value):
		self.info.append({ key: value })
		
	def get(self):
		is_beta = self.request.path.count("beta") > 0 ? True : False
		self.render("index.html", user=self.user, info=tornado.escape.json_encode(self.info), sid=self.sid, beta=is_beta)
		