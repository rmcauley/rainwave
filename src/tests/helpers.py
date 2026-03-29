from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Iterable

from common.cache import cache
from common.db.cursor import RainwaveCursor


@asynccontextmanager
async def ensure_cache_connection() -> AsyncIterator[None]:
    if cache.client is not None:
        yield
        return
    async with cache.cache_connect():
        yield


async def mark_songs_requestable(
    cursor: RainwaveCursor, sid: int, song_ids: Iterable[int]
) -> None:
    for song_id in song_ids:
        await cursor.update(
            "UPDATE r4_song_sid SET song_exists = TRUE, song_cool = FALSE, "
            + "song_elec_blocked = FALSE WHERE sid = %s AND song_id = %s",
            (sid, song_id),
        )
