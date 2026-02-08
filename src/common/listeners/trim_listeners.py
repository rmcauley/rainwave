from common.db.cursor import RainwaveCursor


async def trim_listeners(cursor: RainwaveCursor, sid: int) -> None:
    await cursor.update(
        "DELETE FROM r4_listeners WHERE sid = %s AND listener_purge = TRUE", (sid,)
    )
