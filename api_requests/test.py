from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_url

#@test_get
@handle_url("hello_world")
class HelloWorld(RequestHandler):
	auth_required = False
	sid_required = False
	description = "A simple hello world to test your communication."
	
	def get(self):
		self.append("hello_world", { "hello": "world" })
		
#@test_post
@handle_url("user")
class User(RequestHandler):
	sid_required = False
	description = "A test request that displays the user's information."
	
	def post(self):
		self.append("user", self.user.to_private_dict())