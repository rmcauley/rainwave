from psycopg import sql
from typing import Literal, TypedDict
from common.db.cursor import RainwaveCursor, RainwaveCursorTx


class SongListForAlbumDisplayRow(TypedDict):
    id: int
    length: int
    origin_sid: int
    title: str
    added_on: int
    url: str | None
    link_text: str | None
    rating: float
    requestable: bool
    cool: bool
    cool_end: int | None
    request_only_end: int | None
    request_only: bool
    artist_parseable: str
    rating_user: float | None
    fave: bool | None


async def get_songs_for_album_display(
    cursor: RainwaveCursor | RainwaveCursorTx,
    album_id: int,
    sid: int,
    user_id: int,
    sort: Literal["added_on", "song_title"],
) -> list[SongListForAlbumDisplayRow]:
    requestable = sql.SQL("TRUE") if user_id > 1 else sql.SQL("FALSE")
    order_by = (
        sql.SQL("ORDER BY song_added_on DESC, r4_songs.song_id DESC")
        if sort == "added_on"
        else sql.SQL("ORDER BY song_title")
    )

    query = sql.SQL(
        """
        SELECT 
            r4_song_sid.song_id AS id, 
            song_length AS length, 
            song_origin_sid AS origin_sid, 
            song_title AS title, 
            song_added_on AS added_on, 
            song_url AS url, 
            song_link_text AS link_text, 
            CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
            {requestable} AS requestable, 
            song_cool AS cool, 
            song_cool_end AS cool_end, 
            song_request_only_end AS request_only_end,
            song_request_only AS request_only, 
            song_artist_parseable AS artist_parseable, 
            COALESCE(song_rating_user, 0) AS rating_user, 
            COALESCE(song_fave, FALSE) AS fave 
        FROM r4_song_sid 
            JOIN r4_songs USING (song_id) 
            LEFT JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) 
        WHERE 
            r4_song_sid.song_exists = TRUE 
            AND r4_songs.song_verified = TRUE 
            AND r4_songs.album_id = %s 
            AND r4_song_sid.sid = %s
        {order_by}
    """
    ).format(requestable=requestable, order_by=order_by)

    return await cursor.fetch_all(
        query, (user_id, album_id, sid), row_type=SongListForAlbumDisplayRow
    )
