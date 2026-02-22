import argparse
import asyncio
import shutil
import os
import errno
from typing import TypedDict

from common import config, log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.song.disable_song import disable_song

REMOVE_THRESHOLD = 3.0
REQUIRED_RATING_COUNT = 20
REQONLY_THRESHOLD = 3.3
REQONLY_STATION = 2


class AutoRemoveRow(TypedDict):
    song_id: int
    song_origin_sid: int
    song_filename: str
    album_name: str


async def main(moveto: str, execute: bool) -> None:
    log_file = "%s/rw_auto_clean.log" % (config.log_dir,)
    log.init(log_file, "print")

    await cache_connect()
    await db_connect(auto_retry=False)

    async with get_cursor() as cursor:
        remove_songs = await cursor.fetch_all(
            """
            SELECT 
                song_id, 
                song_origin_sid, 
                song_filename, 
                album_name
            FROM r4_songs 
                JOIN r4_albums USING (album_id)
            WHERE 
                song_rating <= %s 
                AND song_origin_sid != %s 
                AND song_origin_sid != 0 
                AND song_verified = TRUE 
                AND song_rating_count >= %s
            """,
            (REMOVE_THRESHOLD, REQONLY_STATION, REQUIRED_RATING_COUNT),
            row_type=AutoRemoveRow,
        )
        reqonly_songs = await cursor.fetch_all(
            """
            SELECT 
                song_id, 
                song_origin_sid, 
                song_filename,
                album_name 
            FROM r4_songs
                JOIN r4_albums USING (album_id)
            WHERE
                song_rating > %s 
                AND song_rating <= %s 
                AND song_origin_sid != 0 
                AND song_verified = TRUE 
                AND song_rating_count >= %s
            """,
            (REMOVE_THRESHOLD, REQONLY_THRESHOLD, REQUIRED_RATING_COUNT),
            row_type=AutoRemoveRow,
        )

        if REQONLY_STATION:
            reqonly_songs += await cursor.fetch_all(
                """
                SELECT 
                    song_id, 
                    song_origin_sid, 
                    song_filename,
                    album_name
                FROM r4_songs
                    JOIN r4_albums USING (album_id)
                WHERE 
                    song_rating <= %s 
                    AND song_origin_sid = %s 
                    AND song_origin_sid != 0 
                    AND song_verified = TRUE 
                    AND song_rating_count >= %s
                """,
                (REMOVE_THRESHOLD, REQONLY_STATION, REQUIRED_RATING_COUNT),
                row_type=AutoRemoveRow,
            )

        for row in remove_songs:
            fn = row["song_filename"].split(os.sep)[-1]
            dn = "%s%s%s%s%s" % (
                moveto,
                os.sep,
                row["song_origin_sid"],
                os.sep,
                row["album_name"],
            )

            if execute:
                mkdir_p(dn)
                shutil.move(row["song_filename"], "%s%s%s" % (dn, os.sep, fn))

                await disable_song(cursor, row["song_id"])

            print("Disabled: %s" % row["song_filename"])

        for row in reqonly_songs:
            if execute:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_request_only = TRUE, song_request_only_end = NULL WHERE song_id = %s",
                    (row["song_id"],),
                )
                await cursor.update(
                    "UPDATE r4_songs SET song_request_count = 0 WHERE song_id = %s",
                    (row["song_id"],),
                )
            print("Req Only: %s" % row["song_filename"])

        print()
        print("Number of songs disabled (this time): %s" % len(remove_songs))
        print("Number of songs req only (all time) : %s" % len(reqonly_songs))
        print()


def mkdir_p(path: str) -> None:
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Rainwave auto-song cleanup.  WARNING: This script hardcoded for Rainwave's setup!  Please edit the code before using!"
    )
    parser.add_argument("--moveto", default=None, required=True)
    parser.add_argument("--execute", required=False, action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.moveto, args.execute))
