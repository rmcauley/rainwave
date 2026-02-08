import asyncio
from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def remove_all_locks(cursor: RainwaveCursor | RainwaveCursorTx, sid: int) -> None:
    await asyncio.gather(
        cursor.update(
            "UPDATE r4_song_sid SET song_elec_blocked = FALSE, song_elec_blocked_num = 0, song_cool = FALSE, song_cool_end = 0 WHERE sid = %s",
            (sid,),
        ),
        cursor.update(
            "UPDATE r4_album_sid SET album_cool = FALSE AND album_cool_lowest = 0 WHERE sid = %s",
            (sid,),
        ),
    )
