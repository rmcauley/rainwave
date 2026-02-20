from psycopg import sql
from typing import TypedDict

from common.db.cursor import RainwaveCursor


class UnratedSongsRow(TypedDict):
    id: int
    title: str
    album_name: str


async def get_unrated_songs_for_user(
    cursor: RainwaveCursor, user_id: int, limit: int | None
) -> list[UnratedSongsRow]:
    query = sql.SQL(
        """
        SELECT
            r4_songs.song_id AS id,
            song_title AS title,
            album_name
        FROM r4_songs
        JOIN r4_albums USING (album_id) 
        LEFT OUTER JOIN r4_song_ratings ON (
            r4_songs.song_id = r4_song_ratings.song_id
            AND user_id = {user_id}
        )
        WHERE song_verified = TRUE
            AND song_rating_user IS NULL
            AND song_origin_sid > 0
        ORDER BY album_name, song_title
        """
    ).format(user_id=sql.Placeholder(name="user_id"))
    if limit is not None:
        query += sql.SQL("LIMIT {limit}").format(limit=sql.Placeholder(name="limit"))
    return await cursor.fetch_all(
        query,
        {"user_id": user_id, "limit": limit},
        row_type=UnratedSongsRow,
    )
