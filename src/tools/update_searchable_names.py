# Updates the "searchable names" fields in the database that are used for full-text searches

import asyncio
from typing import TypedDict

from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.remove_diacritics import remove_diacritics


class UpdateSearchableNameRow(TypedDict):
    id: int
    name: str


async def main() -> None:
    async with db_connect(auto_retry=False), cache_connect(), get_cursor() as cursor:
        for row in await cursor.fetch_all(
            "SELECT song_id AS id, song_title AS name FROM r4_songs",
            row_type=UpdateSearchableNameRow,
        ):
            await cursor.update(
                "UPDATE r4_songs SET song_title_searchable = %s WHERE song_id = %s",
                (remove_diacritics(row["name"]), row["id"]),
            )

        for row in await cursor.fetch_all(
            "SELECT album_id AS id, album_name AS name FROM r4_albums",
            row_type=UpdateSearchableNameRow,
        ):
            await cursor.update(
                "UPDATE r4_albums SET album_name_searchable = %s WHERE album_id = %s",
                (remove_diacritics(row["name"]), row["id"]),
            )

        for row in await cursor.fetch_all(
            "SELECT group_id AS id, group_name AS name FROM r4_groups",
            row_type=UpdateSearchableNameRow,
        ):
            await cursor.update(
                "UPDATE r4_groups SET group_name_searchable = %s WHERE group_id = %s",
                (remove_diacritics(row["name"]), row["id"]),
            )

        for row in await cursor.fetch_all(
            "SELECT artist_id AS id, artist_name AS name FROM r4_artists",
            row_type=UpdateSearchableNameRow,
        ):
            await cursor.update(
                "UPDATE r4_artists SET artist_name_searchable = %s WHERE artist_id = %s",
                (remove_diacritics(row["name"]), row["id"]),
            )

    print()
    print("Done.")
    print()


if __name__ == "__main__":
    asyncio.run(main())
