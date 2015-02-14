from api.web import APIHandler
from api.exceptions import APIException
from api import fieldtypes
from api.server import test_post
from api.server import handle_api_url
import api_requests.vote
import api_requests.playlist
import api_requests.tune_in

from libs import cache
from libs import config

def attach_info_to_request(request, extra_list = None, all_lists = False):
	# Front-load all non-animated content ahead of the schedule content
	# Since the schedule content is the most animated on R3, setting this content to load
	# first has a good impact on the perceived animation smoothness since table redrawing
	# doesn't have to take place during the first few frames.

	if request.user:
		request.append("user", request.user.to_private_dict())

	if not request.mobile:
		if all_lists or (extra_list == "all_albums") or 'all_albums' in request.request.arguments:
			request.append("all_albums", api_requests.playlist.get_all_albums(request.sid, request.user))
		else:
			request.append("album_diff", cache.get_station(request.sid, 'album_diff'))

		if all_lists or (extra_list == "all_artists") or 'all_artists' in request.request.arguments:
			request.append("all_artists", api_requests.playlist.get_all_artists(request.sid))

		if all_lists or (extra_list == "all_groups") or 'all_groups' in request.request.arguments:
			request.append("all_groups", api_requests.playlist.get_all_groups(request.sid))

		if all_lists or (extra_list == "current_listeners") or 'current_listeners' in request.request.arguments or request.get_cookie("r4_active_list") == "current_listeners":
			request.append("current_listeners", cache.get_station(request.sid, "current_listeners"))

		request.append("request_line", cache.get_station(request.sid, "request_line"))

	sched_next = None
	sched_history = None
	sched_current = None
	if request.user and not request.user.is_anonymous():
		request.append("requests", request.user.get_requests(request.sid))
		sched_current = cache.get_station(request.sid, "sched_current")
		if not sched_current:
			raise APIException("server_just_started", "Rainwave is Rebooting, Please Try Again in a Few Minutes", http_code=500)
		if request.user.is_tunedin():
			sched_current.get_song().data['rating_allowed'] = True
		sched_current = sched_current.to_dict(request.user)
		sched_next = []
		sched_next_objects = cache.get_station(request.sid, "sched_next")
		for evt in sched_next_objects:
			sched_next.append(evt.to_dict(request.user))
		if len(sched_next) > 0 and request.user.is_tunedin() and sched_next_objects[0].is_election:
			sched_next[0]['voting_allowed'] = True
		if request.user.is_tunedin() and request.user.has_perks():
			for i in range(1, len(sched_next)):
				if sched_next_objects[i].is_election:
					sched_next[i]['voting_allowed'] = True
		sched_history = []
		for evt in cache.get_station(request.sid, "sched_history"):
			sched_history.append(evt.to_dict(request.user, check_rating_acl=True))
	elif request.user:
		sched_current = cache.get_station(request.sid, "sched_current_dict")
		if not sched_current:
			raise APIException("server_just_started", "Rainwave is Rebooting, Please Try Again in a Few Minutes", http_code=500)
		sched_next = cache.get_station(request.sid, "sched_next_dict")
		sched_history = cache.get_station(request.sid, "sched_history_dict")
		if len(sched_next) > 0 and request.user.is_tunedin() and sched_next[0]['type'] == "Election":
			sched_next[0]['voting_allowed'] = True
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
							api_requests.vote.append_success_to_request(request, event['id'], history[1])
		else:
			if len(sched_next) > 0 and request.user.data['voted_entry'] > 0 and request.user.data['lock_sid'] == request.sid:
				api_requests.vote.append_success_to_request(request, sched_next[0]['id'], request.user.data['voted_entry'])

	request.append("all_stations_info", cache.get("all_stations_info"))

def check_sync_status(sid, offline_ack=False):
	if not cache.get_station(sid, "backend_ok") and not offline_ack:
		raise APIException("station_offline")
	if cache.get_station(sid, "backend_paused"):
		raise APIException("station_paused")

@test_post
@handle_api_url("info")
class InfoRequest(APIHandler):
	auth_required = False
	description = "Returns current user and station information."
	fields = { 
		"all_albums": (fieldtypes.boolean, False),
		"current_listeners": (fieldtypes.boolean, False),
		"sync_messages": (fieldtypes.boolean, None)
	}
	allow_get = True

	def post(self):
		if self.get_argument("sync_messages"):
			check_sync_status(self.sid)
		
		attach_info_to_request(self)

@handle_api_url("info_all")
class InfoAllRequest(APIHandler):
	auth_required = False
	description = "Returns a basic dict containing rudimentary information on what is currently playing on all stations."
	allow_get = True

	def post(self):
		self.append("all_stations_info", cache.get("all_stations_info"))

@handle_api_url("stations")
class StationsRequest(APIHandler):
	description = "Get information about all available stations."
	auth_required = False
	return_name = "stations"
	sid_required = False

	def post(self):
		station_list = []
		for station_id in config.station_ids:
			station_list.append({
				"id": station_id,
				"name": config.station_id_friendly[station_id],
				"description": self.locale.translate("station_description_id_%s" % station_id),
				"stream": "http://%s:%s/%s" % (config.get_station(station_id, "round_robin_relay_host"), config.get_station(station_id, "round_robin_relay_port"), api_requests.tune_in.get_stream_filename(station_id, user=self.user)),
			})
		self.append(self.return_name, station_list)
