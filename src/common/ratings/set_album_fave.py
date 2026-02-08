from common.db.cursor import RainwaveCursor


async def set_album_fave(
    cursor: RainwaveCursor, album_id: int, user_id: int, fave: bool
) -> None:
    await cursor.update(
        """
        INSERT INTO r4_album_faves (album_id, user_id, album_fave) VALUES (%s, %s, %s)
        ON CONFLICT DO UPDATE SET album_fave = %s
""",
        (album_id, user_id, fave, fave),
    )
