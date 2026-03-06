import asyncio
from typing import TypedDict

from common import log, stations
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.album.get_album_on_station import get_many_album_on_station
from common.playlist.album.model.album import Album


class AllAlbumRow(TypedDict):
    album_id: int
    album_name: str
    album_name_searchable: str
    album_added_on: int


async def main() -> None:
    async with db_connect(auto_retry=False), cache_connect(), get_cursor() as cursor:
        max_id = await cursor.fetch_guaranteed(
            "SELECT max(album_id) AS max_album_id FROM r4_albums",
            params=None,
            default=0,
            var_type=int,
        )
        page_start_id = 0
        while True:
            albums = await cursor.fetch_all(
                "SELECT album_id, album_name, album_name_searchable, album_added_on FROM r4_albums WHERE album_id > %s ORDER BY id LIMIT 100",
                params=(page_start_id,),
                row_type=AllAlbumRow,
            )

            if len(albums) == 0:
                break

            for row in albums:
                txt = "Album %s / %s" % (row["album_id"], max_id)
                txt += " " * (80 - len(txt))
                print("\r" + txt, end="")

                album = Album(row)
                await album.reconcile_sids(cursor)
                await album.update_all_user_ratings(cursor)
                await album.reset_user_completed_flags(cursor)
                for sid in stations.station_ids:
                    for album_on_station in await get_many_album_on_station(
                        cursor, [album.id], sid
                    ):
                        await album_on_station.update_rating(cursor)

            page_start_id = albums[-1]["album_id"]

    print()
    print("Done")
    print()


if __name__ == "__main__":
    log.init()
    asyncio.run(main())
