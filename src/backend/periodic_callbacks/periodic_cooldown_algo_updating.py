from collections.abc import Awaitable, Callable
from common.db.cursor import get_cursor
from common.playlist.cooldown_config import prepare_cooldown_algorithm


def get_periodic_cooldown_algo_updating_function(
    sid: int,
) -> Callable[[], Awaitable[None]]:
    async def cooldown_algo_update() -> None:
        async with get_cursor() as cursor:
            await prepare_cooldown_algorithm(cursor, sid)

    return cooldown_algo_update
