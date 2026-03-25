from typing import Any
from .cache import cache_set, cache_get


async def cache_set_station(sid: int, key: str, value: Any) -> None:
    await cache_set(f"sid{sid}_{key}", value)


async def cache_get_station(sid: int, key: str) -> Any:
    return await cache_get(f"sid{sid}_{key}")
