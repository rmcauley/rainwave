from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def unlock_listeners(cursor: RainwaveCursor | RainwaveCursorTx, sid: int) -> None:
    await cursor.update(
        "UPDATE r4_listeners SET listener_lock_counter = listener_lock_counter - 1 WHERE listener_lock = TRUE AND listener_lock_sid = %s",
        (sid,),
    )
    await cursor.update(
        "UPDATE r4_listeners SET listener_lock = FALSE WHERE listener_lock_counter <= 0"
    )
