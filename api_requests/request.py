from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api.returns

from libs import cache
from libs import log
from rainwave import playlist
from rainwave import user as userlib

@handle_api_url('request')
class SubmitRequest(RequestHandler):
	sid_required = True
	return_name = "request_result"
	login_required = True
	tunein_required = True
	unlocked_listener_only = False
	description = "Submit a request for a song."
	fields = {
		"song_id": (fieldtypes.integer, True)
	}
	
	def post(self):
		self.user.add_request(self.sid, self.get_argument("song_id"))
	
@handle_api_url('delete_request')
class DeleteRequest(RequestHandler):
	sid_required = True
	return_name = "request_result"
	login_required = True
	tunein_required = True
	unlocked_listener_only = False
	fields = {
		"song_id": (fieldtypes.integer, True)
	}
	
	def post(self):
		self.user.remove_request(self.get_argument("song_id"))

@handle_api_url("order_requests")
class OrderRequests(RequestHandler):
	sid_required = True
	return_name = "request_result"
	login_required = True
	tunein_required = True
	unlocked_listener_only = False
	
	def post(self):
		pass
	

