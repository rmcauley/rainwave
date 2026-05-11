import asyncio
import logging

from common import log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.song.update_song_rating import update_song_rating


async def main() -> None:
    log.init(log_stdout_level=logging.DEBUG)
    async with db_connect(auto_retry=False), cache_connect(), get_cursor() as cursor:
        max_id = await cursor.fetch_guaranteed(
            "SELECT max(song_id) AS max_song_id FROM r4_songs",
            params=None,
            default=0,
            var_type=int,
        )
        page_start_id = 0
        while True:
            songs = await cursor.fetch_list(
                "SELECT song_id FROM r4_songs WHERE song_id > %s ORDER BY song_id LIMIT 100",
                (page_start_id,),
                row_type=int,
            )

            if len(songs) == 0:
                break

            for song_id in songs:
                txt = "Song %s / %s" % (song_id, max_id)
                txt += " " * (80 - len(txt))
                print("\r" + txt, end="")

                await update_song_rating(cursor, song_id)

    print()
    print("Done")
    print()


if __name__ == "__main__":
    asyncio.run(main())
