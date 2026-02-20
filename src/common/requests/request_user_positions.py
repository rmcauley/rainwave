from typing import cast
from common.cache.station_cache import cache_get_station


RequestUserPositions = dict[int, int]


async def get_request_user_positions(sid: int) -> RequestUserPositions:
    return cast(
        RequestUserPositions,
        await cache_get_station(sid, "request_user_positions") or {},
    )
