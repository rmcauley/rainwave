import asyncio
from typing import cast

import orjson

from api.exceptions import APIException
from api.handler_classes.rainwave_handler import RainwaveHandler
from common.cache.cache import cache_get
from common.cache.station_cache import cache_get_station
from common.db.cursor import RainwaveCursor
from api import rainwave_typeddicts
from common.playlist.album.model.album_on_station import AlbumDiff
from common.requests.get_user_requests import get_user_requests
from common.schedule.timeline_types import TimelineOnStation


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

    (timeline_api, album_diff, all_station_info) = cast(
        tuple[
            TimelineOnStation | None,
            list[AlbumDiff],
            rainwave_typeddicts.AllStationsInfo,
        ],
        await asyncio.gather(
            cache_get_station(request.sid, "timeline_api"),
            cache_get_station(request.sid, "album_diff"),
            cache_get("all_stations_info"),
        ),
    )
    if timeline_api is None:
        raise APIException(
            "server_just_started",
            "Rainwave is Rebooting, Please Try Again in a Few Minutes",
            http_code=500,
        )

    if request.user and not request.user.is_anonymous():
        song_requests = await get_user_requests(cursor, request.sid, request.user.id)
        request.response["requests"] = []
        for song_request in song_requests:
            album: rainwave_typeddicts.RequestAlbum = {
                "art": song_request["album_art_url"],
                "id": song_request["album_id"],
                "name": song_request["album_name"],
                "rating": song_request["rating"],
                "rating_complete": song_request["album_rating_complete"],
                "rating_user": song_request["rating_user"],
            }
            song_request_api: rainwave_typeddicts.Request = {
                "albums": [album],
                "artists": [
                    {"id": artist["name"], "name": artist["name"]}
                    for artist in orjson.loads(song_request["artist_parseable"])
                ],
                "cool": song_request["cool"],
                "cool_end": song_request["cool_end"],
                "elec_blocked": song_request["elec_blocked"],
                "elec_blocked_by": cast(
                    rainwave_typeddicts.ElecBlockedBy, song_request["elec_blocked_by"]
                ),
                "elec_blocked_num": song_request["elec_blocked_num"],
                "fave": song_request["fave"],
                "good": song_request["good"],
                "id": song_request["id"],
                "length": song_request["length"],
                "link_text": song_request["song_link_text"],
                "order": song_request["order"],
                "origin_sid": cast(
                    rainwave_typeddicts.StationId, song_request["origin_sid"]
                ),
                "rating": song_request["rating"],
                "rating_user": song_request["rating_user"],
                "request_id": song_request["request_id"],
                "sid": cast(rainwave_typeddicts.StationId, song_request["sid"]),
                "title": song_request["title"],
                "url": song_request["song_url"],
                "valid": song_request["valid"],
            }
            request.response["requests"].append(song_request_api)

        if request.user.is_tunedin():
            sched_current[""]
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
