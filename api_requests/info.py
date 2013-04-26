import tornado.web

from api.web import RequestHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api_requests.vote

from libs import cache
from libs import log
from rainwave import playlist

def attach_info_to_request(request):
	# Front-load all non-animated content ahead of the schedule content
	# Since the schedule content is the most animated on R3, setting this content to load
	# first has a good impact on the perceived animation smoothness since table redrawing
	# doesn't have to take place during the first few frames.

	if request.user:
		request.append("user", request.user.to_private_dict())
		
	if 'playlist' in request.request.arguments:
		request.append("all_albums", playlist.get_all_albums_list(request.user))
	elif 'artist_list' in request.request.arguments:
		request.append("artist_list", playlist.get_all_artists_list(request.sid))
	elif 'init' not in request.request.arguments:
		request.append("album_diff", cache.get_station(request.sid, 'album_diff'))
	
	request.append("requests_all", cache.get_station(request.sid, "request_all"))
	request.append("calendar", cache.get("calendar"))
	request.append("listeners_current", cache.get_station(request.sid, "listeners_current"))
	
	sched_next = []
	sched_history = []
	if request.user:
		request.append("requests_user", request.user.get_requests())
		# TODO: Some mixing of pre-dictionaried items here might help speed
		request.append("sched_current", cache.get_station(request.sid, "sched_current").to_dict(request.user))
		for evt in cache.get_station(request.sid, "sched_next"):
			sched_next.append(evt.to_dict(request.user))
		for evt in cache.get_station(request.sid, "sched_history"):
			sched_history.append(evt.to_dict(request.user))
	else:
		request.append("sched_current", cache.get_station(request.sid, "sched_current_dict"))
		sched_next = cache.get_station(request.sid, "sched_next_dict")
		sched_history = cache.get_station(request.sid, "sched_history_dict")
	request.append("sched_next", sched_next)
	request.append("sched_history", sched_history)
	if request.user:
		if request.user.data['listener_voted_entry'] > 0:
			request.append("vote_result", { "code": 700, "text": api_requests.vote.SubmitVote.return_codes[700], "entry_id": request.user.data['listener_voted_entry'], "try_again": False })
		elif not request.user.is_anonymous() and cache.get_user(request.user, user_vote_cache):
			for history in cache.get_user(request.user, user_vote_cache):
				for event in sched_history:
					if history[0] == event.id:
						request.append("vote_result", { "code": 700, "text": api_requests.vote.SubmitVote.return_codes[700], "entry_id": history[1], "try_again": False })
			
	
@test_post
@handle_api_url("info")
class InfoRequest(RequestHandler):
	auth_required = False
	description = "Returns applicable user and station info."
	fields = { "playlist": (fieldtypes.boolean, False), "artist_list": (fieldtypes.boolean, False) }
	allow_get = True

	def post(self):
		attach_info_to_request(self)