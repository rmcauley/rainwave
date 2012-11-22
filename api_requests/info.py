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
	# Front-load all non-animated content ahead of the schedule content
	# Since the schedule content is the most animated on R3, setting this content to load
	# first has a good impact on the perceived animation smoothness since table redrawing
	# doesn't have to take place during the first few frames.

	if request.user:
		request.append("user", request.user.to_public_dict())
		
	if 'playlist' in request.request.arguments:
		request.append("all_albums", playlist.get_all_albums_list(request.user))
	elif 'artist_list' in request.request.arguments:
		request.append("artist_list", playlist.get_all_artists_list(request.sid))
	elif 'init' not in request.request.arguments:
		request.append("album_diff", cache.get_station(request.sid, 'album_diff'))
	
	request.append("requests_all", cache.get_station(request.sid, "request_all"))
	request.append("calendar", cache.get("calendar"))
	request.append("listeners_current", cache.get_station(request.sid, "listeners_current"))
	
	if request.user:
		request.append("requests_user", request.user.get_requests())
		# TODO: Some mixing of pre-dictionaried items here might help speed
		self.append("sched_current", cache.get_station(self.sid, "sched_current").to_dict(self.user))
		self.append("sched_next", cache.get_station(self.sid, "sched_next").to_dict(self.user))
		self.append("sched_history", cache.get_station(self.sid, "sched_history").to_dict(self.user))
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
