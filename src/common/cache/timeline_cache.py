import asyncio
from typing import Any, Coroutine, TypedDict, cast

from common.cache.cache import cache_get
from common.cache.station_cache import cache_get_station, cache_set_station
from common.cache.update_user_rating_acl import UserRatingACL
from common.db.cursor import RainwaveCursor
from common.playlist.album.model.album_on_station import AlbumOnStation
from common.schedule.timeline import TimelineOnStation
from api import rainwave_typeddicts
from common.schedule.update_live_voting import update_live_voting_cache


class TimelineApiCache(TypedDict):
    sched_current: rainwave_typeddicts.TimelineEntry
    sched_next: list[rainwave_typeddicts.TimelineEntry]
    sched_history: list[rainwave_typeddicts.TimelineEntry]


async def update_timeline_api_cache(
    cursor: RainwaveCursor,
    sid: int,
    timeline: TimelineOnStation,
    modified_albums: list[AlbumOnStation],
) -> None:
    await cache_set_station(sid, "timeline", timeline)

    if timeline.current is None:
        raise ValueError("Cannot cache a timeline with no current entry.")

    sched_current = await timeline.current.to_api(cursor)
    sched_next: list[rainwave_typeddicts.TimelineEntry] = []
    for timeline_entry in timeline.upnext:
        api_entry = await timeline_entry.to_api(cursor)
        sched_next.append(api_entry)
        if api_entry["type"] == "Election" or api_entry["type"] == "PVPElection":
            await update_live_voting_cache(cursor, sid, api_entry["id"])
    await cache_set_station(sid, "sched_next_dict", sched_next)

    sched_history: list[rainwave_typeddicts.TimelineEntry] = []
    for timeline_entry in timeline.history:
        sched_history.append(await timeline_entry.to_api(cursor))
    await cache_set_station(sid, "sched_history_dict", sched_history)

    timeline_api_cache: TimelineApiCache = {
        "sched_current": sched_current,
        "sched_history": sched_history,
        "sched_next": sched_next,
    }
    await cache_set_station(sid, "timeline_api", timeline_api_cache)

    all_station: rainwave_typeddicts.StationInfo = {
        "title": sched_current["songs"][0]["title"],
        "album": sched_current["songs"][0]["albums"][0]["name"],
        "art": sched_current["songs"][0]["albums"][0]["art"],
        "artists": ", ".join(
            artist["name"] for artist in sched_current["songs"][0]["artists"]
        ),
        "event_name": sched_current["name"],
        "event_type": sched_current["type"],
    }
    await cache_set_station(sid, "all_station_info", all_station)

    await cache_set_station(
        sid, "album_diff", [album.to_album_diff() for album in modified_albums]
    )


def get_station_timeline_from_cache(
    sid: int,
) -> Coroutine[Any, Any, TimelineApiCache | None]:
    return cache_get_station(sid, "timeline_api")


async def get_timeline_api_cache(sid: int) -> tuple[
    TimelineApiCache | None,
    rainwave_typeddicts.AlbumDiff | None,
    rainwave_typeddicts.AllStationsInfo | None,
    UserRatingACL | None,
]:
    timeline_api, album_diff, all_station_info, user_rating_acl = cast(
        tuple[
            TimelineApiCache | None,
            rainwave_typeddicts.AlbumDiff | None,
            rainwave_typeddicts.AllStationsInfo | None,
            UserRatingACL | None,
        ],
        await asyncio.gather(
            get_station_timeline_from_cache(sid),
            cache_get_station(sid, "album_diff"),
            cache_get("all_stations_info"),
            cache_get_station(sid, "user_rating_acl"),
        ),
    )

    return (timeline_api, album_diff, all_station_info, user_rating_acl)
