from typing import Any
from .cache import cache_set, cache_get


async def cache_set_user(user_id: int, key: str, value: Any) -> None:
    await cache_set(f"u{user_id}_{key}", value)


async def cache_get_user(user_id: int, key: str) -> Any:
    return await cache_get(f"u{user_id}_{key}")
