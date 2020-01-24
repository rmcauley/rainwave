from time import time as timestamp
import hashlib

from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url

from libs import config
from libs import db

@handle_api_url(r"test/create_anon_tuned_in/(\d+)")
class CreateAnonTunedIn(APIHandler):
	description = "Creates a fake tune-in record for an anonymous user at 127.0.0.1."
	local_only = True
	sid_required = False
	auth_required = False
	allow_get = True
	return_name = "create_anon_tuned_in_result"

	def post(self, sid):	#pylint: disable=W0221
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE listener_ip = '127.0.0.1' AND user_id = 1") == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('127.0.0.1', 1, %s, 1)", (int(sid),))
			self.append_standard("dev_anon_user_tunein_ok", "Anonymous user tune in 127.0.0.1 record completed.")
			return
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE listener_ip = '::1' AND user_id = 1") == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('::1', 1, %s, 1)", (int(sid),))
			self.append_standard("dev_anon_user_tunein_ok", "Anonymous user tune in ::1 record completed.")
			return
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE listener_ip = 'localhost' AND user_id = 1") == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('localhost', 1, %s, 1)", (int(sid),))
			self.append_standard("dev_anon_user_tunein_ok", "Anonymous user tune in localhost record completed.")
			return
		raise APIException(500, "internal_error", "Anonymous user tune in record already exists.")

class TestUserRequest(APIHandler):
	description = "Login as a user."
	local_only = True
	sid_required = False
	auth_required = False
	allow_get = True

	def post(self, sid):	#pylint: disable=W0221
		user_id = db.c.fetch_var("SELECT MAX(user_id) FROM phpbb_users")
		if user_id and user_id < 2:
			user_id = user_id + 1
			db.c.update("INSERT INTO phpbb_users (username, user_id, group_id) VALUES ('Test" + str(user_id) + "', %s, 5)", (user_id,))
		elif not user_id:
			user_id = 2
			db.c.update("INSERT INTO phpbb_users (username, user_id, group_id) VALUES ('Test" + str(user_id) + "', %s, 5)", (user_id,))
		self.set_cookie(config.get("phpbb_cookie_name") + "_u", user_id)
		session_id = db.c.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s", (user_id,))
		if not session_id:
			session_id = hashlib.md5(repr(timestamp())).hexdigest()
			db.c.update("INSERT INTO phpbb_sessions (session_id, session_user_id) VALUES (%s, %s)", (session_id, user_id))
		self.set_cookie(config.get("phpbb_cookie_name") + "_u", user_id)
		self.set_cookie(config.get("phpbb_cookie_name") + "_sid", session_id)
		self.execute(user_id, sid)
		self.append_standard("dev_login_ok", "You are now user ID %s session ID %s" % (user_id, session_id))

	def execute(self, user_id, sid):
		pass

@handle_api_url(r"test/login_tuned_in/(\d+)")
class CreateLoginTunedIn(TestUserRequest):
	description = "Creates or uses a user account with a tuned in record and sets the appropriate cookies so you're that user."
	auth_required = False
	sid_required = False
	return_name = "login_tuned_in_result"

	def execute(self, user_id, sid):
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (user_id,)) == 0:
			db.c.update("INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('127.0.0.1', %s, %s, 1)", (user_id, sid))

@handle_api_url(r"test/login_tuned_out/(\d+)")
class CreateLoginTunedOut(TestUserRequest):
	description = "Creates or uses a user account with no tuned in record sets the appropriate cookies so you're that user."
	auth_required = False
	return_name = "login_tuned_out_result"

	def execute(self, user_id, sid):
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (user_id,)) > 0:
			db.c.update("DELETE FROM r4_listeners WHERE user_id = %s ", (user_id,))
