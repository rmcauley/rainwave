from backend.db.cursor import RainwaveCursor


async def set_song_fave(
    cursor: RainwaveCursor, song_id: int, user_id: int, fave: bool
) -> None:
    await cursor.update(
        """
        INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES (%s, %s, %s)
        ON CONFLICT DO UPDATE SET song_fave = %s
""",
        (song_id, user_id, fave, fave),
    )
