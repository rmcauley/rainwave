import time
import hashlib

from api.web import RequestHandler
from api.server import handle_api_url

from libs import config
from libs import db

@handle_api_url("test/create_anon_tuned_in/(\d+)")
class CreateAnonTunedIn(RequestHandler):
	description = "Creates a fake tune-in record for an anonymous user at 127.0.0.1."
	local_only = True
	sid_required = False
	auth_required = False
	allow_get = True
	
	def post(self, sid):
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE listener_ip = '127.0.0.1' AND user_id = 1") == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('127.0.0.1', 1, %s, 1)", (int(sid),))
			self.append("test_tunein_result", "Anonymous user tune in record completed.")
		else:
			self.append("test_tunein_result", "Anonymous user tune in record already exists.")
			
class TestUserRequest(RequestHandler):
	local_only = True
	sid_required = False
	auth_required = False
	allow_get = True

	def post(self, sid):
		user_id = db.c.fetch_var("SELECT MAX(user_id) FROM phpbb_users")
		if user_id < 2:
			user_id = user_id + 1
			db.c.update("INSERT INTO phpbb_users (username, user_id) VALUES ('Test" + str(user_id) + ", %s)", (user_id,))
		self.set_cookie(config.get("phpbb_cookie_name") + "_u", user_id)
		session_id = db.c.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s", (user_id,))
		if not session_id:
			session_id = hashlib.md5(repr(time.time())).hexdigest()
			db.c.update("INSERT INTO phpbb_sessions (session_id, session_user_id) VALUES (%s, %s)", (session_id, user_id))
		self.set_cookie(config.get("phpbb_cookie_name") + "_u", user_id)
		self.set_cookie(config.get("phpbb_cookie_name") + "_sid", session_id)
		self.execute(user_id, sid)
		self.append("test_login_result", "You are now user ID %s session ID %s" % (user_id, session_id))
		
	def execute(self):
		pass
	
@handle_api_url("test/login_tuned_in/(\d+)")
class CreateLoginTunedIn(TestUserRequest):
	description = "Creates or uses a user account with a tuned in record and sets the appropriate cookies so you're that user."
	auth_required = False

	def execute(self, user_id, sid):
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (user_id,)) == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('127.0.0.1', %s, %s, 1)", (int(sid), user_id))
	

@handle_api_url("test/login_tuned_out/(\d+)")
class CreateLoginTunedOut(TestUserRequest):
	description = "Creates or uses a user account with no tuned in record sets the appropriate cookies so you're that user."
	auth_required = False

	def execute(self, user_id, sid):
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (user_id,)) > 0:
			db.c.update("DELETE FROM r4_listeners WHERE user_id = %s ", (user_id,))