from tornado.web import HTTPError
from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url

from libs import cache
from libs import log
from libs import db
from rainwave import playlist
from rainwave import user as userlib

@handle_api_url('request')
class SubmitRequest(APIHandler):
	sid_required = True
	login_required = True
	tunein_required = False
	unlocked_listener_only = False
	description = "Submits a request for a song."
	fields = {
		"song_id": (fieldtypes.song_id, True)
	}

	def post(self):
		if self.user.add_request(self.sid, self.get_argument("song_id")):
			self.append_standard("request_success")
			self.append("requests", self.user.get_requests(refresh=True))
		else:
			raise APIException("request_failed")

@handle_api_url('delete_request')
class DeleteRequest(APIHandler):
	description = "Removes a request from the user's queue."
	sid_required = False
	login_required = True
	tunein_required = False
	unlocked_listener_only = False
	fields = {
		"song_id": (fieldtypes.song_id, True)
	}

	def post(self):
		if self.user.remove_request(self.get_argument("song_id")):
			self.append_standard("request_deleted")
			self.append("requests", self.user.get_requests(refresh=True))
		else:
			raise APIException("request_delete_failed")

@handle_api_url("order_requests")
class OrderRequests(APIHandler):
	description = "Change the order of requests in the user's queue.  Submit a comma-separated list of Song IDs, in desired order."
	sid_required = False
	login_required = True
	tunein_required = False
	unlocked_listener_only = False
	fields = {
		"order": (fieldtypes.song_id_list, True)
	}

	def post(self):
		order = 0
		for song_id in self.get_argument("order"):
			db.c.update("UPDATE r4_request_store SET reqstor_order = %s WHERE user_id = %s AND song_id = %s", (order, self.user.id, song_id))
			order = order + 1
		self.append_standard("requests_reordered")
		self.append("requests", self.user.get_requests(refresh=True))

@handle_api_url("request_unrated_songs")
class RequestUnratedSongs(APIHandler):
	description = "Fills the user's request queue with unrated songs."
	sid_required = True
	login_required = True
	tunein_required = False
	unlocked_listener_only = False

	def post(self):
		if self.user.add_unrated_requests(self.sid):
			self.append_standard("request_unrated_songs_success")
			self.append("requests", self.user.get_requests(refresh=True))
		else:
			raise APIException("request_unrated_failed")
