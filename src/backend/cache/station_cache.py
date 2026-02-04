from typing import Any
from .cache import cache_set, cache_get


async def cache_set_station(
    sid: int, key: str, value: Any, *, save_in_memory: bool = False
) -> None:
    await cache_set(f"sid{sid}_{key}", value, save_in_memory=save_in_memory)


async def cache_get_station(sid: int, key: str) -> Any:
    return cache_get(f"sid{sid}_{key}")
