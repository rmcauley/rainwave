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
			self.append("requests", self.user.get_requests(refresh=True))
			"""
				Added this code to add a request_result in the return
				json so that "Requested." will be displayed when
				you successfully request a song. There might be
				cleaner ways to do it, but that's up to you!
				-Blorp
			"""
			resp=[ { 
				"code" : 200,
				"success" : true,
				"text" : "Requested.",
				"tl_key" : ""
			} ]
			self.append("request_result", resp)
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
		self.append("requests", self.user.get_requests(refresh=True))

@handle_api_url("request_unrated_songs")
class RequestUnratedSongs(APIHandler):
	description = "Fills the user's request queue with unrated songs."
	sid_required = True
	login_required = True
	tunein_required = False
	unlocked_listener_only = False

	def post(self):
		if self.user.add_unrated_requests(self.sid) > 0:
			self.append("requests", self.user.get_requests(refresh=True))
		else:
			raise APIException("request_unrated_failed")

@handle_api_url("clear_requests")
class ClearRequests(APIHandler):
	description = "Clears all requests the user."
	sid_required = False
	login_required = True
	tunein_required = False
	unlocked_listener_only = False

	def post(self):
		self.user.clear_all_requests()
		self.append("requests", self.user.get_requests(refresh=True))

@handle_api_url("pause_request_queue")
class PauseRequestQueue(APIHandler):
	description = "Stops the user from having their request queue processed while they're listening.  Will remove them from the line."
	sid_required = False
	login_required = True
	tunein_required = False
	unlocked_listener_only = False

	def post(self):
		self.user.pause_requests()
		self.append("user", self.user.to_private_dict())
		if self.user.data['requests_paused']:
			self.append_standard("radio_requests_paused")
		else:
			self.append_standard("radio_requests_unpaused")

@handle_api_url("unpause_request_queue")
class UnPauseRequestQueue(APIHandler):
	description = "Allows the user's request queue to continue being processed.  Adds the user back to the request line."
	sid_required = True
	login_required = True
	tunein_required = False
	unlocked_listener_only = False

	def post(self):
		self.user.unpause_requests(self.sid)
		self.append("user", self.user.to_private_dict())
		if self.user.data['requests_paused']:
			self.append_standard("radio_requests_paused")
		else:
			self.append_standard("radio_requests_unpaused")
