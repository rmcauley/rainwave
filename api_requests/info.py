import tornado.web

from api.web import APIHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api_requests.vote
import api_requests.playlist

from libs import cache
from libs import log
from rainwave import playlist

def attach_info_to_request(request, playlist = False, artists = False):
	# Front-load all non-animated content ahead of the schedule content
	# Since the schedule content is the most animated on R3, setting this content to load
	# first has a good impact on the perceived animation smoothness since table redrawing
	# doesn't have to take place during the first few frames.

	if request.user:
		request.append("user", request.user.to_private_dict())

	if playlist or 'all_albums' in request.request.arguments:
		request.append("all_albums", api_requests.playlist.get_all_albums(request.sid, request.user))
	else:
		request.append("album_diff", cache.get_station(request.sid, 'album_diff'))
	if artists or 'all_artists' in request.request.arguments:
		request.append("all_artists", cache.get_station(request.sid, 'all_artists'))

	request.append("request_line", cache.get_station(request.sid, "request_line"))
	# request.append("calendar", cache.get("calendar"))
	request.append("listeners_current", cache.get_station(request.sid, "listeners_current"))

	sched_next = []
	sched_history = []
	sched_current = {}
	if request.user:
		request.append("requests", request.user.get_requests())
		# TODO: Some mixing of pre-dictionaried items here might help speed...?
		sched_current = cache.get_station(request.sid, "sched_current").to_dict(request.user)
		for evt in cache.get_station(request.sid, "sched_next"):
			sched_next.append(evt.to_dict(request.user))
		for evt in cache.get_station(request.sid, "sched_history"):
			sched_history.append(evt.to_dict(request.user))
	else:
		sched_current = cache.get_station(request.sid, "sched_current_dict")
		sched_next = cache.get_station(request.sid, "sched_next_dict")
		sched_history = cache.get_station(request.sid, "sched_history_dict")
	request.append("sched_current", sched_current)
	request.append("sched_next", sched_next)
	request.append("sched_history", sched_history)
	if request.user:
		if not request.user.is_anonymous():
			user_vote_cache = cache.get_user(request.user, "vote_history")
			temp_current = list()
			temp_current.append(sched_current)
			if user_vote_cache:
				for history in user_vote_cache:
					for event in (sched_history + sched_next + temp_current):
						if history[0] == event['id']:
							api_requests.vote.append_success_to_request(self, event['id'], history[1])
		elif request.user.data['listener_voted_entry'] > 0 and request.user.data['listener_lock_sid'] == request.sid:
			api_requests.vote.append_success_to_request(self, sched_next[0].id, request.user.data['listener_voted_entry'])

@test_post
@handle_api_url("info")
class InfoRequest(APIHandler):
	auth_required = False
	description = "Returns applicable user and station info."
	fields = { "playlist": (fieldtypes.boolean, False), "artist_list": (fieldtypes.boolean, False) }
	allow_get = True

	def post(self):
		attach_info_to_request(self)
