from typing import TypedDict

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.metadata import MetadataInsertionError
from common.playlist.remove_diacritics import remove_diacritics


class ArtistRow(TypedDict):
    artist_id: int
    artist_name: str
    artist_name_searchable: str


class Artist:
    id: int
    data: ArtistRow

    def __init__(self, artist_row: ArtistRow):
        self.id = artist_row["artist_id"]
        self.data = artist_row

    @staticmethod
    async def upsert(cursor: RainwaveCursor | RainwaveCursorTx, name: str) -> Artist:
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
        return Artist(upserted)
