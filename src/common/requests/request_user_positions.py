from typing import cast
from common.cache.cache import cache_get


RequestUserPositions = dict[int, int]


async def get_request_user_positions() -> RequestUserPositions:
    return cast(RequestUserPositions, await cache_get("request_user_positions") or {})
