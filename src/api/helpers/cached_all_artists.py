from api.rainwave_typeddicts import ArtistInList
from common import stations
from common.db.cursor import get_cursor

cached_all_artists: dict[int, list[ArtistInList]] = {}


async def update_all_artists_cache() -> None:
    async with get_cursor() as cursor:
        for sid in stations.station_ids:
            cached_all_artists[sid] = await cursor.fetch_all(
                """
                SELECT 
                    artist_name AS name, 
                    artist_id AS id, 
                    COUNT(*) AS song_count 
                FROM r4_artists 
                    JOIN r4_song_artist USING (artist_id) 
                    JOIN r4_song_sid using (song_id) 
                WHERE r4_song_sid.sid = %s AND song_exists = TRUE 
                GROUP BY artist_id, artist_name 
                ORDER BY artist_id
                """,
                (sid,),
                row_type=ArtistInList,
            )
