import time
import hashlib

from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url

from libs import config
from libs import db

@handle_api_url("test/hello_world")
class HelloWorld(RequestHandler):
	auth_required = False
	sid_required = False
	description = "A simple hello world to test your communication."
	local_only = True
	
	def post(self):
		self.append("hello_world", { "hello": "world" })
		
@handle_api_url("test/user")
class User(RequestHandler):
	sid_required = False
	description = "A test request that displays the user's information."
	local_only = True
	
	def post(self):
		self.append("user", self.user.to_private_dict())
