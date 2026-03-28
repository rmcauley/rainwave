from time import time as timestamp

from psycopg import sql

from common.db.build_insert import build_insert_on_conflict_do_update
from common.db.cursor import RainwaveCursor
from .update_album_ratings import UpdatedAlbumRating, update_album_ratings


async def set_song_rating(
    cursor: RainwaveCursor, sid: int, song_id: int, user_id: int, rating: float | None
) -> list[UpdatedAlbumRating]:
    to_upsert = {
        "song_id": song_id,
        "user_id": user_id,
        "song_rating_user": rating,
        "song_rated_at": timestamp(),
    }
    await cursor.update(
        build_insert_on_conflict_do_update(
            "r4_song_ratings",
            to_upsert,
            sql.SQL("(user_id, song_id)"),
        ),
        to_upsert,
    )
    albums = await update_album_ratings(cursor, sid, song_id, user_id)
    return albums


async def clear_song_rating(
    cursor: RainwaveCursor, sid: int, song_id: int, user_id: int
) -> list[UpdatedAlbumRating]:
    return await set_song_rating(cursor, sid, song_id, user_id, rating=None)
