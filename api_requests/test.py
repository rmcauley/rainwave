from api.web import APIHandler
from api.server import handle_api_url

@handle_api_url("test/hello_world")
class HelloWorld(APIHandler):
	auth_required = False
	sid_required = False
	description = "A simple hello world to test your communication."
	local_only = True

	def post(self):
		self.append("hello_world", { "hello": "world" })

@handle_api_url("test/user")
class UserInfo(APIHandler):
	sid_required = False
	description = "A test request that displays the user's information."
	local_only = True
	phpbb_auth = True

	def post(self):
		self.append("user", self.user.to_private_dict())

