from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def trim_listeners(cursor: RainwaveCursor | RainwaveCursorTx, sid: int) -> None:
    await cursor.update(
        "DELETE FROM r4_listeners WHERE sid = %s AND listener_purge = TRUE", (sid,)
    )
