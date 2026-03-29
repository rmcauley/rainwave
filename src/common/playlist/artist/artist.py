from typing import TypedDict

from psycopg import sql

from common.db.build_insert import build_insert
from common.db.cursor import RainwaveCursor
from common.playlist.get_searchable_string import get_searchable_string


class CouldNotUpsertArtistError(Exception):
    pass


class ArtistRow(TypedDict):
    artist_id: int
    artist_name: str
    artist_name_searchable: str


class Artist:
    id: int
    data: ArtistRow

    def __init__(self, artist_row: ArtistRow):
        super().__init__()
        self.id = artist_row["artist_id"]
        self.data = artist_row

    @staticmethod
    async def upsert(cursor: RainwaveCursor, name: str) -> Artist:
        existing = await cursor.fetch_row(
            "SELECT artist_id, artist_name, artist_name_searchable FROM r4_artists WHERE artist_name = %s",
            (name,),
            row_type=ArtistRow,
        )
        if not existing:
            to_insert = {
                "artist_name": name,
                "artist_name_searchable": get_searchable_string(name),
            }
            inserted = await cursor.fetch_row(
                build_insert("r4_artists", to_insert) + sql.SQL(" RETURNING *"),
                to_insert,
                row_type=ArtistRow,
            )
            if inserted is None:
                raise CouldNotUpsertArtistError(
                    f"Could not upsert artist with name {name}"
                )
            return Artist(inserted)
        return Artist(existing)
