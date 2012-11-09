import tornado.web

from api.web import RequestHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_url

from libs import cache
from libs import log
from rainwave import playlist

def attach_info_to_request(request):
	if request.user:
		request.append("user", request.user.get_public_dict())
		
	if 'playlist' in request.request.arguments:
		request.append("all_albums", playlist.fetch_all_albums(request.user))
	elif 'artist_list' in request.request.arguments:
		request.append("artist_list", playlist.fetch_all_artists(request.sid))
	elif 'init' not in request.request.arguments:
		request.append("album_diff", cache.get_station(request.sid, 'album_diff'))
	
	request.append("requests_all", cache.get_station(request.sid, "request_all"))

	request.append("calendar", cache.get("calendar"))
	request.append("listeners_current", cache.get_station(request.sid, "listeners_current"))
	
	if request.user:
		request.append("requests_user", request.user.get_requests())
		request.append("sched_current", request.user.make_event_jsonable(cache.get_station(request.sid, "sched_current")))
		request.append("sched_next", request.user.make_events_jsonable(cache.get_station(request.sid, "sched_next")))
		request.append("sched_history", request.user.make_event_jsonable(cache.get_station(request.sid, "sched_history")))
	else:
		request.append("sched_current", cache.get_station(request.sid, "sched_current"))
		request.append("sched_next", cache.get_station(request.sid, "sched_next"))
		request.append("sched_history", cache.get_station(request.sid, "sched_history"))
	
@test_get
@handle_url("info")
class InfoRequest(RequestHandler):
	auth_required = False
	description = "Returns applicable user and station info."
	fields = { "playlist": (fieldtypes.boolean, False), "artist_list": (fieldtypes.boolean, False) }
	
	def get(self):
		attach_info_to_request(self)
