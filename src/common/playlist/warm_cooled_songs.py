from time import time as timestamp
import asyncio
from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def warm_cooled_songs(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int
) -> None:
    await asyncio.gather(
        cursor.update(
            "UPDATE r4_song_sid SET song_cool = FALSE WHERE sid = %s AND song_cool_end < %s AND song_cool = TRUE",
            (sid, int(timestamp())),
        ),
        cursor.update(
            "UPDATE r4_song_sid SET song_request_only = FALSE WHERE sid = %s AND song_request_only_end IS NOT NULL AND song_request_only_end < %s AND song_request_only = TRUE",
            (sid, int(timestamp())),
        ),
    )
