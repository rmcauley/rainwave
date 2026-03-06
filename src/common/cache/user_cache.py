from typing import Any
from .cache import cache_set, cache_get


async def cache_set_user(
    user_id: int, key: str, value: Any, *, save_in_memory: bool = False
) -> None:
    await cache_set(f"u{user_id}_{key}", value, save_in_memory=save_in_memory)


async def cache_get_user(user_id: int, key: str) -> Any:
    return cache_get(f"u{user_id}_{key}")
