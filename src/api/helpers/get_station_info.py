import asyncio
from typing import TypedDict, cast

from api.exceptions import APIException
from api.helpers.user_vote_cache import get_user_vote_cache
from api.rainwave_return_key_to_open_api import RainwaveResponse
from common.cache.cache import cache_get
from common.cache.station_cache import cache_get_station
from common.cache.timeline_cache import TimelineApiCache
from common.cache.update_user_rating_acl import UserRatingACL
from common.db.cursor import RainwaveCursor
from api import rainwave_typeddicts
from common.requests.get_user_requests import get_user_requests, user_requests_to_api
from common.schedule.is_api_timeline_entry_an_election import (
    is_api_timeline_entry_an_election,
)
from common.user.model.user_base import UserBase


class SongRatingRow(TypedDict):
    song_id: int
    song_rating_user: float | None
    song_fave: bool | None


class AlbumRatingRow(TypedDict):
    album_id: int
    album_rating_user: float | None
    album_fave: bool | None


SongRatings = dict[int, tuple[float | None, bool | None]]
AlbumRatings = dict[int, tuple[float | None, bool | None]]


def _attach_rating_to_song(
    song_ratings: SongRatings,
    album_ratings: AlbumRatings,
    song: rainwave_typeddicts.TimelineSong,
) -> None:
    (rating_user, fave) = song_ratings.get(song["id"], (None, None))
    (album_rating_user, album_fave) = album_ratings.get(
        song["albums"][0]["id"], (None, None)
    )
    song["rating_user"] = rating_user
    song["fave"] = fave
    song["albums"][0]["rating_user"] = album_rating_user
    song["albums"][0]["fave"] = album_fave


async def get_station_info(
    cursor: RainwaveCursor,
    optional_user: UserBase | None,
    sid: int,
    include_request_line: bool,
    include_live_voting: bool,
) -> RainwaveResponse:
    response: RainwaveResponse = {}
    if optional_user:
        response["user"] = optional_user.to_api_with_private_data()

    if include_request_line:
        response["request_line"] = await cache_get_station(sid, "request_line")

    (timeline_api, album_diff, all_station_info, user_rating_acl) = cast(
        tuple[
            TimelineApiCache | None,
            rainwave_typeddicts.AlbumDiff,
            rainwave_typeddicts.AllStationsInfo,
            UserRatingACL | None,
        ],
        await asyncio.gather(
            cache_get_station(sid, "timeline_api"),
            cache_get_station(sid, "album_diff"),
            cache_get("all_stations_info"),
            cache_get_station(sid, "user_rating_acl"),
        ),
    )
    if timeline_api is None:
        raise APIException(
            "server_just_started",
            "Rainwave is Rebooting, Please Try Again in a Few Minutes",
            http_code=500,
        )

    sched_current = timeline_api["sched_current"]
    sched_history = timeline_api["sched_history"]
    sched_next = timeline_api["sched_next"]

    if optional_user and not optional_user.is_anonymous():
        song_requests = await get_user_requests(cursor, sid, optional_user.id)
        response["requests"] = user_requests_to_api(song_requests)

        song_ids: list[int] = []
        album_ids: list[int] = []
        for upnext in sched_next:
            for song in upnext["songs"]:
                song_ids.append(song["id"])
                album_ids.append(song["albums"][0]["id"])
        for song in sched_current["songs"]:
            song_ids.append(song["id"])
            album_ids.append(song["albums"][0]["id"])
        for history_entry in sched_history:
            for song in history_entry["songs"]:
                song_ids.append(song["id"])
                album_ids.append(song["albums"][0]["id"])

        song_rating_rows = await cursor.fetch_all(
            """
            SELECT 
                song_id, 
                song_rating_user, 
                song_fave 
            FROM r4_song_ratings 
            WHERE 
                song_id = ANY (%s) 
                AND user_id = %s
            """,
            (song_ids, optional_user.id),
            row_type=SongRatingRow,
        )
        album_rating_rows = await cursor.fetch_all(
            """
            SELECT 
                r4_album_sid.album_id AS album_id,
                album_rating_user, 
                album_fave 
            FROM r4_album_sid 
                LEFT JOIN r4_album_ratings ON (
                    r4_album_sid.album_id = r4_album_ratings.album_id
                    AND r4_album_sid.sid = r4_album_ratings.sid
                )
                LEFT JOIN r4_album_faves ON (
                    r4_album_sid.album_id = r4_album_faves.album_id
                )
            WHERE
                r4_album_sid.album_id = ANY (%s)
                AND r4_album_sid.sid = %s
            """,
            (album_ids, sid),
            row_type=AlbumRatingRow,
        )

        song_ratings = {
            row["song_id"]: (row["song_rating_user"], row["song_fave"])
            for row in song_rating_rows
        }
        album_ratings = {
            row["album_id"]: (
                row["album_rating_user"],
                row["album_fave"],
            )
            for row in album_rating_rows
        }

        if optional_user.is_tunedin():
            sched_current["songs"][0]["rating_allowed"] = True

        if (
            len(sched_next) > 0
            and optional_user.is_tunedin()
            and is_api_timeline_entry_an_election(sched_next[0])
            and len(sched_next[0]["songs"]) > 1
        ):
            sched_next[0]["voting_allowed"] = True

        if optional_user.is_tunedin() and optional_user.has_perks():
            for i in range(1, len(sched_next)):
                if (
                    is_api_timeline_entry_an_election(sched_next[0])
                    and len(sched_next[0]["songs"]) > 1
                ):
                    sched_next[i]["voting_allowed"] = True

        for upnext in sched_next:
            for song in upnext["songs"]:
                _attach_rating_to_song(song_ratings, album_ratings, song)
        for song in sched_current["songs"]:
            _attach_rating_to_song(song_ratings, album_ratings, song)
        for history_entry in sched_history:
            for song in history_entry["songs"]:
                _attach_rating_to_song(song_ratings, album_ratings, song)
                if optional_user.has_perks():
                    song["rating_allowed"] = True
                elif (
                    user_rating_acl
                    and song["id"] in user_rating_acl
                    and optional_user.id in user_rating_acl[song["id"]]
                ):
                    song["rating_allowed"] = True

    response["sched_current"] = sched_current
    response["sched_next"] = sched_next
    response["sched_history"] = sched_history

    if optional_user:
        if optional_user.is_anonymous():
            if (
                len(sched_next) > 0
                and optional_user.private_data["voted_entry"] is not None
                and optional_user.private_data["voted_entry"] > 0
                and optional_user.private_data["lock_sid"] == sid
            ):
                response["already_voted"] = [
                    [
                        sched_next[0]["id"],
                        optional_user.private_data["voted_entry"],
                    ]
                ]
        else:
            user_vote_cache = await get_user_vote_cache(optional_user.id)
            if user_vote_cache:
                response["already_voted"] = user_vote_cache

    response["all_stations_info"] = all_station_info
    response["album_diff"] = album_diff

    if include_live_voting:
        response["live_voting"] = await cache_get_station(sid, "live_voting")

    return response
