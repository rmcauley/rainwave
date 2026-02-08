import asyncio
from api.exceptions import APIException
from common import config
from .cache import client, in_memory, cache_set
from .station_cache import cache_get_station


async def refresh_in_memory_cache_item(key: str) -> None:
    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    bytes_key = key.encode("utf-8")
    in_memory[bytes_key] = client.get(bytes_key)


async def refresh_in_memory_station_cache_item(sid: int, key: str) -> None:
    if not client:
        raise APIException("internal_error", "No memcache connection.", http_code=500)
    # we can't use the normal get functions here since they'll ping what's already in local
    full_key = f"sid{sid}_{key}".encode("utf-8")
    in_memory[full_key] = client.get(full_key)


async def refresh_in_memory_station_cache(sid: int) -> None:
    await asyncio.gather(
        refresh_in_memory_station_cache_item(sid, "album_diff"),
        refresh_in_memory_station_cache_item(sid, "sched_next"),
        refresh_in_memory_station_cache_item(sid, "sched_history"),
        refresh_in_memory_station_cache_item(sid, "sched_current"),
        refresh_in_memory_station_cache_item(sid, "sched_next_dict"),
        refresh_in_memory_station_cache_item(sid, "sched_history_dict"),
        refresh_in_memory_station_cache_item(sid, "sched_current_dict"),
        refresh_in_memory_station_cache_item(sid, "current_listeners"),
        refresh_in_memory_station_cache_item(sid, "request_line"),
        refresh_in_memory_station_cache_item(sid, "request_user_positions"),
        refresh_in_memory_station_cache_item(sid, "user_rating_acl"),
        refresh_in_memory_station_cache_item(sid, "user_rating_acl_song_index"),
        refresh_in_memory_cache_item("request_expire_times"),
    )

    all_stations = {}
    for station_id in config.station_ids:
        all_stations[station_id] = await cache_get_station(
            station_id, "all_station_info"
        )
    await cache_set("all_stations_info", all_stations)
