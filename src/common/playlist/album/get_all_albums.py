from typing import TypedDict

from common.db.cursor import RainwaveCursor, RainwaveCursorTx


class AlbumsListRow(TypedDict):
    id: int
    name: str
    rating: float
    cool: bool
    cool_lowest: int
    fave: bool
    rating_user: float
    rating_complete: bool
    newest_song_time: int


async def get_all_albums_list(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, user_id: int
) -> list[AlbumsListRow]:
    if user_id == 1:
        return await cursor.fetch_all(
            """
            SELECT 
                r4_albums.album_id AS id, 
                album_name AS name, 
                CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, 
                album_cool AS cool, 
                album_cool_lowest AS cool_lowest, 
                FALSE AS fave, 
                0 AS rating_user, 
                FALSE AS rating_complete, 
                album_newest_song_time AS newest_song_time 
            FROM r4_albums 
                JOIN r4_album_sid USING (album_id) 
            WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE 
            """,
            (sid,),
            row_type=AlbumsListRow,
        )

    return await cursor.fetch_all(
        """
            SELECT 
                r4_albums.album_id AS id, 
                album_name AS name, 
                CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, 
                album_cool AS cool, 
                album_cool_lowest AS cool_lowest, 
                COALESCE(album_fave, FALSE) AS fave, 
                COALESCE(album_rating_user, 0) AS rating_user, 
                COALESCE(album_rating_complete, FALSE) AS rating_complete, 
                album_newest_song_time AS newest_song_time 
            FROM r4_albums 
                JOIN r4_album_sid USING (album_id) 
            LEFT JOIN r4_album_ratings ON (
                r4_album_sid.album_id = r4_album_ratings.album_id 
                AND r4_album_ratings.user_id = %(user_id)s 
                AND r4_album_ratings.sid = %(sid)s
            ) 
            LEFT JOIN r4_album_faves ON (
                r4_album_sid.album_id = r4_album_faves.album_id 
                AND r4_album_faves.user_id = %(user_id)s
            ) 
            WHERE r4_album_sid.sid = %(sid)s AND r4_album_sid.album_exists = TRUE 
""",
        ({"user_id": user_id, "sid": sid}),
        row_type=AlbumsListRow,
    )
