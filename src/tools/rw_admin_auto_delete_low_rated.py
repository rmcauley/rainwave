#!/usr/bin/env python

import argparse
import shutil
import os
import errno

from libs import config
from common.libs import db
from libs import cache
from libs import log

from common.rainwave.playlist_objects.song import Song


def mkdir_p(path: str) -> None:
    try:
        os.makedirs(path)
    except OSError as exc:  # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Rainwave auto-song cleanup.  WARNING: This script hardcoded for Rainwave's setup!  Please edit the code before using!"
    )
    parser.add_argument("--config", default=None, required=True)
    parser.add_argument("--moveto", default=None, required=True)
    parser.add_argument("--execute", required=False, action="store_true")
    args = parser.parse_args()
    config.load(args.config)
    log_file = "%s/rw_auto_clean.log" % (config.get_directory("log_dir"),)
    log.init(log_file, "print")
    db.connect()
    cache.connect()

    REMOVE_THRESHOLD = 3.0
    REQUIRED_RATING_COUNT = 20
    REQONLY_THRESHOLD = 3.3
    REQONLY_STATION = 2

    remove_songs = await cursor.fetch_all(
        "SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid != %s AND song_origin_sid != 0 AND song_verified = TRUE AND song_rating_count >= %s",
        (REMOVE_THRESHOLD, REQONLY_STATION, REQUIRED_RATING_COUNT),
    )
    reqonly_songs = await cursor.fetch_all(
        "SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating > %s AND song_rating <= %s AND song_origin_sid != 0 AND song_verified = TRUE AND song_rating_count >= %s",
        (REMOVE_THRESHOLD, REQONLY_THRESHOLD, REQUIRED_RATING_COUNT),
    )

    if REQONLY_STATION:
        reqonly_songs += await cursor.fetch_all(
            "SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid = %s AND song_origin_sid != 0 AND song_verified = TRUE AND song_rating_count >= %s",
            (REMOVE_THRESHOLD, REQONLY_STATION, REQUIRED_RATING_COUNT),
        )

    for row in remove_songs:
        song = Song.load_from_id(row["song_id"])
        fn = row["song_filename"].split(os.sep)[-1]
        dn = "%s%s%s%s%s" % (
            args.moveto,
            os.sep,
            row["song_origin_sid"],
            os.sep,
            song.album.data["name"] if song.album else None,
        )

        if args.execute:
            mkdir_p(dn)
            shutil.move(row["song_filename"], "%s%s%s" % (dn, os.sep, fn))

            song.disable()

        print("Disabled: %s" % row["song_filename"])

    for row in reqonly_songs:
        if args.execute:
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
