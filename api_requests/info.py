from typing import cast
from api.web import APIHandler
from api.exceptions import APIException
from api import fieldtypes
from api.urls import handle_api_url
import api_requests.vote
import api_requests.playlist
import api_requests.tune_in
from rainwave.events.event import BaseEvent

from libs import cache
from libs import config


def attach_dj_info_to_request(request):
    request.append(
        "dj_info",
        {
            "pause_requested": cache.get_station(request.sid, "backend_paused"),
            "pause_active": cache.get_station(request.sid, "backend_paused_playing"),
            "pause_title": cache.get_station(request.sid, "pause_title"),
            "dj_password": cache.get_station(request.sid, "dj_password"),
            "mount_host": config.get_station(request.sid, "liquidsoap_harbor_host"),
            "mount_port": config.get_station(request.sid, "liquidsoap_harbor_port"),
            "mount_url": config.get_station(request.sid, "liquidsoap_harbor_mount"),
        },
    )


def attach_info_to_request(
    request: APIHandler, extra_list=None, all_lists=False, live_voting=False
):
    # Front-load all non-animated content ahead of the schedule content
    # Since the schedule content is the most animated on R3, setting this content to load
    # first has a good impact on the perceived animation smoothness since table redrawing
    # doesn't have to take place during the first few frames.

    if request.user:
        if request.mega_debug:
            request.write("User ID during info attach: %s\n" % request.user.id)
        request.append("user", request.user.to_private_dict())
        if request.user.is_dj():
            attach_dj_info_to_request(request)

    if not request.mobile:
        if (
            all_lists
            or (extra_list == "all_albums")
            or (extra_list == "album")
            or "all_albums" in request.request.arguments
        ):
            request.append(
                "all_albums",
                api_requests.playlist.get_all_albums(request.sid, request.user),
            )
        else:
            request.append("album_diff", cache.get_station(request.sid, "album_diff"))

        if (
            all_lists
            or (extra_list == "all_artists")
            or (extra_list == "artist")
            or "all_artists" in request.request.arguments
        ):
            request.append(
                "all_artists", api_requests.playlist.get_all_artists(request.sid)
            )

        if (
            all_lists
            or (extra_list == "all_groups")
            or (extra_list == "group")
            or "all_groups" in request.request.arguments
        ):
            request.append(
                "all_groups", api_requests.playlist.get_all_groups(request.sid)
            )

        if (
            all_lists
            or (extra_list == "current_listeners")
            or "current_listeners" in request.request.arguments
            or request.get_cookie("r4_active_list") == "current_listeners"
        ):
            request.append(
                "current_listeners", cache.get_station(request.sid, "current_listeners")
            )

        request.append("request_line", cache.get_station(request.sid, "request_line"))

    sched_next = []
    sched_history = None
    sched_current = None
    if request.user and not request.user.is_anonymous():
        request.append("requests", request.user.get_requests(request.sid))
        sched_current = cache.get_station(request.sid, "sched_current")
        if not sched_current:
            raise APIException(
                "server_just_started",
                "Rainwave is Rebooting, Please Try Again in a Few Minutes",
                http_code=500,
            )
        if request.user.is_tunedin():
            sched_current.get_song().data["rating_allowed"] = True
        sched_current = sched_current.to_dict(request.user)
        sched_next = []
        sched_next_objects = cast(
            list[BaseEvent], cache.get_station(request.sid, "sched_next")
        )
        for evt in sched_next_objects:
            sched_next.append(evt.to_dict(request.user))
        if (
            len(sched_next) > 0
            and request.user.is_tunedin()
            and sched_next_objects[0].is_election
            and len(sched_next_objects[0].songs) > 1
        ):
            sched_next[0]["voting_allowed"] = True
        if request.user.is_tunedin() and request.user.has_perks():
            for i in range(1, len(sched_next)):
                if (
                    sched_next_objects[i].is_election
                    and len(sched_next_objects[i].songs) > 1
                ):
                    sched_next[i]["voting_allowed"] = True
        sched_history = []
        for evt in cast(
            list[BaseEvent], cache.get_station(request.sid, "sched_history")
        ):
            sched_history.append(evt.to_dict(request.user, check_rating_acl=True))
    elif request.user:
        sched_current = cache.get_station(request.sid, "sched_current_dict")
        if not sched_current:
            raise APIException(
                "server_just_started",
                "Rainwave is Rebooting, Please Try Again in a Few Minutes",
                http_code=500,
            )
        sched_next = cast(list[dict], cache.get_station(request.sid, "sched_next_dict"))
        sched_history = cache.get_station(request.sid, "sched_history_dict")
        if (
            len(sched_next) > 0
            and request.user.is_tunedin()
            and sched_next[0]["type"] == "Election"
            and len(sched_next[0]["songs"]) > 1
        ):
            sched_next[0]["voting_allowed"] = True
    request.append("sched_current", sched_current)
    request.append("sched_next", sched_next)
    request.append("sched_history", sched_history)
    if request.user:
        if not request.user.is_anonymous():
            user_vote_cache = cache.get_user(request.user, "vote_history")
            if user_vote_cache:
                request.append("already_voted", user_vote_cache)
        else:
            if (
                len(sched_next) > 0
                and request.user.data.get("voted_entry")
                and request.user.data.get("voted_entry") > 0  # type: ignore
                and request.user.data["lock_sid"] == request.sid
            ):
                request.append(
                    "already_voted",
                    [(sched_next[0]["id"], request.user.data["voted_entry"])],
                )

    request.append("all_stations_info", cache.get("all_stations_info"))

    if live_voting:
        request.append("live_voting", cache.get_station(request.sid, "live_voting"))


def check_sync_status(sid, offline_ack: bool | None = False):
    if not cache.get_station(sid, "backend_ok") and not offline_ack:
        raise APIException("station_offline")
    if cache.get_station(sid, "backend_paused") and not offline_ack:
        raise APIException("station_paused")


@handle_api_url("info")
class InfoRequest(APIHandler):
    auth_required = False
    description = "Returns current user and station information.  all_albums will append a list of all albums to the request (will slow down your request).  current_listeners will add a list of all current listeners to your request.  Setting 'status' to true will have the response change if the station is currently being DJed. (not recommended to set this to true)"
    fields = {
        "all_albums": (fieldtypes.boolean, False),
        "current_listeners": (fieldtypes.boolean, False),
        "status": (fieldtypes.boolean, None),
    }
    allow_get = True
    allow_cors = True

    def post(self):
        if self.get_argument("status"):
            check_sync_status(self.sid)

        attach_info_to_request(self)


@handle_api_url("info_all")
class InfoAllRequest(APIHandler):
    auth_required = False
    description = "Returns a basic dict containing rudimentary information on what is currently playing on all stations."
    allow_get = True
    allow_cors = True

    def post(self):
        self.append("all_stations_info", cache.get("all_stations_info"))


@handle_api_url("stations")
class StationsRequest(APIHandler):
    description = "Get information about all available stations."
    auth_required = False
    return_name = "stations"
    sid_required = False
    allow_cors = True
    allow_get = True

    def post(self):
        station_list = []
        for station_id in config.station_ids:
            station_list.append(
                {
                    "id": station_id,
                    "name": config.station_id_friendly[station_id],
                    "description": self.locale.translate(
                        "station_description_id_%s" % station_id
                    ),
                    "stream": api_requests.tune_in.get_round_robin_url(
                        station_id, user=self.user
                    ),
                    "relays": config.public_relays[station_id],
                    "key": config.get_station(station_id, "stream_filename"),
                }
            )
        self.append(self.return_name, station_list)
