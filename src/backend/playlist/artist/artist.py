from typing import TypedDict

from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.metadata import MetadataInsertionError
from backend.playlist.remove_diacritics import remove_diacritics


class ArtistRow(TypedDict):
    id: int
    name: str
    name_searchable: str


class Artist:
    select_by_name_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE lower(artist_name) = lower(%s)"
    select_by_id_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE artist_id = %s"
    select_by_song_id_query = 'SELECT r4_artists.artist_id AS id, r4_artists.artist_name AS name, r4_song_artist.artist_is_tag AS is_tag, artist_order AS "order" FROM r4_song_artist JOIN r4_artists USING (artist_id) WHERE song_id = %s ORDER BY artist_order'
    disassociate_song_id_query = (
        "DELETE FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
    )
    associate_song_id_query = "INSERT INTO r4_song_artist (song_id, artist_id, artist_is_tag, artist_order) VALUES (%s, %s, %s, %s)"
    has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
    check_self_size_query = "SELECT COUNT(song_id) FROM r4_song_artist JOIN r4_songs USING (song_id) WHERE artist_id = %s AND song_verified = TRUE"
    delete_self_query = "DELETE FROM r4_artists WHERE artist_id = %s"

    @staticmethod
    async def upsert(cursor: RainwaveCursor | RainwaveCursorTx, name: str) -> ArtistRow:
        upserted = await cursor.fetch_row(
            """
            INSERT INTO r4_artists (artist_name, artist_name_searchable) VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            RETURNING *
            """,
            (name, remove_diacritics(name)),
            row_type=ArtistRow,
        )
        if upserted is None:
            raise MetadataInsertionError(f"Could not upsert artist with name {name}")
        return upserted
