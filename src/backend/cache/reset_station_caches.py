from backend import config
from .cache import cache_set
from .station_cache import cache_set_station


async def reset_station_caches() -> None:
    await cache_set("request_expire_times", None, save_in_memory=True)
    for sid in config.station_ids:
        await cache_set_station(sid, "album_diff", None, save_in_memory=True)
        await cache_set_station(sid, "sched_next", None, save_in_memory=True)
        await cache_set_station(sid, "sched_history", None, save_in_memory=True)
        await cache_set_station(sid, "sched_current", None, save_in_memory=True)
        await cache_set_station(sid, "current_listeners", None, save_in_memory=True)
        await cache_set_station(sid, "request_line", None, save_in_memory=True)
        await cache_set_station(
            sid, "request_user_positions", None, save_in_memory=True
        )
        await cache_set_station(sid, "user_rating_acl", None, save_in_memory=True)
        await cache_set_station(
            sid, "user_rating_acl_song_index", None, save_in_memory=True
        )
