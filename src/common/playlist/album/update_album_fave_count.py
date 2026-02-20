from common.db.cursor import RainwaveCursor


async def update_fave_count(cursor: RainwaveCursor, album_id: int) -> None:
    await cursor.update(
        """
        UPDATE r4_album_sid SET album_fave_count = (
            SELECT COUNT(*) FROM r4_album_faves WHERE album_fave = TRUE AND album_id = %s
        ) WHERE album_id = %s
        """,
        (album_id, album_id),
    )
