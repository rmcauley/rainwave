from libs import db
import api.web
from api.server import handle_api_url
from api import fieldtypes

@handle_api_url("user_search")
class UserSearchRequest(api.web.APIHandler):
	description = "Returns a user ID and station they're currently tuned to based on the username provided. (used by Rainwave's IRC bot)"
	fields = { "username": (fieldtypes.string, True) }
	auth_required = False
	sid_required = False

	def post(self):
		possible_id = db.c.fetch_var("SELECT user_id FROM phpbb_users WHERE username = %s", (self.get_argument("username"),))
		if possible_id:
			possible_sid = db.c.fetch_var("SELECT sid FROM r4_listeners WHERE user_id = %s", (possible_id,))
			self.append("user", { "user_id": possible_id, "sid": possible_sid })
		else:
			self.append("user", { "user_id": None, "sid": None })
