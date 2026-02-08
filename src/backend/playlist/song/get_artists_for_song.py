from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.artist.artist import Artist, ArtistRow


async def get_artists_for_song(
    cursor: RainwaveCursor | RainwaveCursorTx, song_id: int
) -> list[Artist]:
    artist_rows = await cursor.fetch_all(
        """
        SELECT r4_artists.* 
        FROM r4_song_artist 
            JOIN r4_artists USING (artist_id) 
        WHERE song_id = %s 
        ORDER BY r4_song_artist.artist_order
        """,
        (song_id,),
        row_type=ArtistRow,
    )
    return [Artist(artist_row) for artist_row in artist_rows]
