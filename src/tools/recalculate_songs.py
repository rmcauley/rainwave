#!/usr/bin/env python

import argparse

from libs import config
from common.libs import db
from libs import log
from common.rainwave.playlist import Song

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Recalculates all song global ratings.  Can take a while."
    )
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    config.load(args.config)
    log.init()
    db.connect()

    songs = await cursor.fetch_list("SELECT song_id FROM r4_songs")
    i = 0
    for song_id in songs:
        txt = "Song %s / %s" % (i, len(songs))
        txt += " " * (80 - len(txt))
        print("\r" + txt, end="")
        i += 1

        s = Song.load_from_id(song_id)
        s.update_rating()
