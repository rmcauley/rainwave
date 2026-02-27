from api.exceptions import APIException
from api.handler_classes.rainwave_handler import RainwaveHandler
from common.cache.station_cache import cache_get_station
from common.db.cursor import RainwaveCursor
from api import rainwave_typeddicts


async def attach_info_to_request(
    cursor: RainwaveCursor,
    request: RainwaveHandler,
    include_request_line: bool,
    include_live_voting: bool,
) -> None:
    if request.user:
        request.response["user"] = request.user.to_api_with_private_data()

    if include_request_line:
        request.response["request_line"] = await cache_get_station(
            request.sid, "request_line"
        )

    sched_next: rainwave_typeddicts.SchedNext = []
    sched_history: rainwave_typeddicts.SchedHistory = None
    sched_current: rainwave_typeddicts.SchedCurrent = None
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
