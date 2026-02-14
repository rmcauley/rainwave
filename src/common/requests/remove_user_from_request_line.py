from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def remove_user_from_request_line(
    cursor: RainwaveCursor | RainwaveCursorTx, user_id: int
):
    await cursor.update("DELETE FROM r4_request_line WHERE user_id = %s", (user_id,))
