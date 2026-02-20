from common.cache.station_cache import cache_set_station
from common.playlist.album.model.album_on_station import AlbumOnStation
from common.schedule.timeline import TimelineOnStation


async def update_memcache_for_station(
    sid: int, timeline: TimelineOnStation, modified_albums: list[AlbumOnStation]
) -> None:
    await cache_set_station(sid, "timeline", timeline)

    sched_current_dict = current[sid].to_dict()
    await cache_set_station(sid, "sched_current_dict", sched_current_dict, True)

    next_dict_list = []
    for event in upnext[sid]:
        next_dict_list.append(event.to_dict())
    await cache_set_station(sid, "sched_next_dict", next_dict_list, True)

    history_dict_list = []
    for event in history[sid]:
        history_dict_list.append(event.to_dict())
    await cache_set_station(sid, "sched_history_dict", history_dict_list, True)

    all_station = {}
    if "songs" in sched_current_dict:
        all_station["title"] = sched_current_dict["songs"][0]["title"]
        all_station["album"] = sched_current_dict["songs"][0]["albums"][0]["name"]
        all_station["art"] = sched_current_dict["songs"][0]["albums"][0]["art"]
        all_station["artists"] = ", ".join(
            artist["name"] for artist in sched_current_dict["songs"][0]["artists"]
        )
    else:
        all_station["title"] = None
        all_station["album"] = None
        all_station["art"] = None
        all_station["artists"] = None
    all_station["event_name"] = sched_current_dict["name"]
    all_station["event_type"] = sched_current_dict["type"]
    await cache_set_station(sid, "all_station_info", all_station, True)

    _update_schedule_memcache(sid)
    update_live_voting(sid)
    cache.prime_rating_cache_for_events(
        sid, [current[sid]] + upnext[sid] + history[sid]
    )
    await cache_set_station(
        sid, "current_listeners", listeners.get_listeners_dict(sid), True
    )
    await cache_set_station(
        sid, "album_diff", playlist.get_updated_albums_dict(sid), True
    )
    rainwave.playlist_objects.album.clear_updated_albums(sid)
    await cache_set_station(sid, "all_albums", playlist.get_all_albums_list(sid), True)
    await cache_set_station(
        sid, "all_artists", playlist.get_all_artists_list(sid), True
    )
    await cache_set_station(sid, "all_groups", playlist.get_all_groups_list(sid), True)
    await cache_set_station(
        sid, "all_groups_power", playlist.get_all_groups_for_power(sid), True
    )
