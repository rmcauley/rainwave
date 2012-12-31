import tornado.web
import tornado.escape
import time
import hashlib

from api.server import handle_url
from api.web import RequestHandler
from api_requests import info
from api import fieldtypes

from libs import config
from libs import cache
from libs import log
from libs import db
from rainwave.user import User

@handle_url("authtest")
class MainIndex(tornado.web.RequestHandler):
	def prepare(self):
		# TODO: Language
		self.info = []
		self.sid = fieldtypes.integer(self.get_cookie("r4sid", "1"))
		if not self.sid:
			self.sid = 1
		
		if self.request.host == "game.rainwave.cc":
			self.sid = 1
		elif self.request.host == "ocr.rainwave.cc":
			self.sid = 2
		elif self.request.host == "covers.rainwave.cc" or self.request.host == "cover.rainwave.cc":
			self.sid = 3
		elif self.request.host == "chiptune.rainwave.cc":
			self.sid = 4
		elif self.request.host == "all.rainwave.cc":
			self.sid = 5
		
		self.set_cookie("r4sid", str(self.sid), expires_days=365, domain=".rainwave.cc")
	
		self.user = None
		if not fieldtypes.integer(self.get_cookie("phpbb3_38ie8_u", "")):
			self.user = User(1)
		else:
			user_id = int(self.get_cookie("phpbb3_38ie8_u"))
			if self.get_cookie("phpbb3_38ie8_sid"):
				session_id = db.c_old.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_id = %s AND session_user_id = %s", (self.get_cookie("phpbb3_38ie8_sid"), user_id))
				if session_id:
					db.c_old.update("UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s", (time.time(), "rainwave", session_id))
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)

			if not self.user and self.get_cookie("phpbb3_38ie8_k"):
				can_login = db.c_old.fetch_var("SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s", (hashlib.md5(self.get_cookie("phpbb3_38ie8_k")).hexdigest(), user_id))
				if can_login == 1:
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)

		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key(self.request.remote_ip)
		self.user.data['sid'] = self.sid
		
	# this is so that get_info can be called, makes us compatible with the custom web handler used elsewhere in RW
	def append(self, key, value):
		self.info.append({ key: value })
		
	def get(self):
		info.attach_info_to_request(self)
		self.set_header("Content-Type", "text/plain")
		self.render("index.html", user=self.user, info=tornado.escape.json_encode(self.info), sid=self.sid)
		
# @handle_url("authtest_beta")
# class BetaIndex(MainIndex):
	# def get(self):
		# if self.user.data['group_id'] not in (5, 4, 8, 12, 15, 14, 17):
			# self.send_error(403)
		# else:
			# info.attach_info_to_request(self)
			# self.set_header("Content-Type", "text/plain")
			# self.render("index.html", user=self.user, info=tornado.escape.json_encode(self.info), sid=self.sid)