from typing import cast

from api import rainwave_typeddicts
from common.cache.user_cache import cache_get_user, cache_set_user


async def set_user_vote_cache(
    user_id: int, user_vote_cache: rainwave_typeddicts.AlreadyVoted
):
    await cache_set_user(user_id, "already_voted", user_vote_cache)


async def get_user_vote_cache(user_id: int) -> rainwave_typeddicts.AlreadyVoted | None:
    return cast(
        rainwave_typeddicts.AlreadyVoted | None,
        await cache_get_user(user_id, "already_voted"),
    )
