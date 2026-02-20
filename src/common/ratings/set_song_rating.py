from common.db.cursor import RainwaveCursor
from .update_album_ratings import UpdatedAlbumRating, update_album_ratings
from time import time as timestamp


async def set_song_rating(
    cursor: RainwaveCursor, sid: int, song_id: int, user_id: int, rating: float | None
) -> list[UpdatedAlbumRating]:
    await cursor.update(
        """
        INSERT INTO r4_song_ratings 
            (song_id, user_id, song_rating_user, song_rated_at)
        VALUES (%s, %s, %s, %s)
""",
        (song_id, user_id, rating, timestamp()),
    )
    albums = await update_album_ratings(cursor, sid, song_id, user_id)
    return albums


async def clear_song_rating(
    cursor: RainwaveCursor, sid: int, song_id: int, user_id: int
) -> list[UpdatedAlbumRating]:
    return await set_song_rating(cursor, sid, song_id, user_id, rating=None)
