from common.db.cursor import RainwaveCursor


async def remove_user_from_request_line(cursor: RainwaveCursor, user_id: int):
    await cursor.update("DELETE FROM r4_request_line WHERE user_id = %s", (user_id,))
