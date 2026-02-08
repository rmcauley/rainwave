from typing import TypedDict

from common.db.cursor import RainwaveCursor, RainwaveCursorTx


class AllArtistsRow(TypedDict):
    artist_name: str
    artist_id: int
    artist_song_count: int


async def get_all_artists_list(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int
) -> list[AllArtistsRow]:
    return await cursor.fetch_all(
        """
        SELECT 
            artist_name, 
            artist_id, 
            COUNT(*) AS artist_song_count 
        FROM r4_artists 
            JOIN r4_song_artist USING (artist_id) 
            JOIN r4_song_sid using (song_id) 
        WHERE r4_song_sid.sid = %s AND song_exists = TRUE 
        GROUP BY artist_id, artist_name 
        ORDER BY artist_name
""",
        (sid,),
        row_type=AllArtistsRow,
    )
