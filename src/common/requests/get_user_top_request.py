from typing import TypedDict

from common.db.cursor import RainwaveCursor


class TopRequestSongRow(TypedDict):
    id: int
    title: str
    album_name: str
    album_id: int


async def get_top_request_song(
    cursor: RainwaveCursor, user_id: int, sid: int
) -> TopRequestSongRow | None:
    return await cursor.fetch_row(
        """
        SELECT 
            r4_request_store.song_id AS id, 
            r4_songs.song_title AS title,
            album_name,
            album_id 
        FROM r4_request_store 
            JOIN r4_song_sid USING (song_id) 
            JOIN r4_songs USING (song_id)
            JOIN r4_albums USING (album_id) 
        WHERE 
            user_id = %s 
            AND r4_song_sid.sid = %s 
            AND song_exists = TRUE 
            AND song_cool = FALSE 
            AND song_elec_blocked = FALSE 
        ORDER BY reqstor_order, reqstor_id
        LIMIT 1
        """,
        (user_id, sid),
        row_type=TopRequestSongRow,
    )
