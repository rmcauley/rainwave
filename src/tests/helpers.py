from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Iterable

from common.cache import cache
from common.db.cursor import RainwaveCursor


@asynccontextmanager
async def ensure_cache_connection() -> AsyncGenerator[None]:
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


async def clone_songs_to_sid(
    cursor: RainwaveCursor, sid: int, song_ids: Iterable[int]
) -> None:
    for song_id in song_ids:
        album_id = await cursor.fetch_var(
            "SELECT album_id FROM r4_songs WHERE song_id = %s",
            (song_id,),
            var_type=int,
        )
        assert album_id is not None
        await cursor.update(
            """
            INSERT INTO r4_song_sid (
                song_id, sid, song_exists, song_cool, song_request_only, song_elec_blocked
            ) VALUES (%s, %s, TRUE, FALSE, FALSE, FALSE)
            ON CONFLICT (song_id, sid) DO UPDATE SET
                song_exists = EXCLUDED.song_exists,
                song_cool = EXCLUDED.song_cool,
                song_request_only = EXCLUDED.song_request_only,
                song_elec_blocked = EXCLUDED.song_elec_blocked
            """,
            (song_id, sid),
        )
        await cursor.update(
            """
            INSERT INTO r4_album_sid (
                album_id, sid, album_exists, album_song_count, album_requests_pending
            ) VALUES (%s, %s, TRUE, 1, NULL)
            ON CONFLICT (album_id, sid) DO UPDATE SET
                album_exists = EXCLUDED.album_exists,
                album_song_count = EXCLUDED.album_song_count,
                album_requests_pending = EXCLUDED.album_requests_pending
            """,
            (album_id, sid),
        )
