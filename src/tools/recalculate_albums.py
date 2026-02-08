#!/usr/bin/env python

import argparse

from libs import config
from common.libs import db
from libs import log
from libs import cache
from common.rainwave.playlist import Album

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Recalculates all album ratings, both global ratings and for every user.  Takes a while."
    )
    parser.add_argument("--config", default=None)
    args = parser.parse_args()

    config.load(args.config)
    cache.connect()
    log.init()
    db.connect()

    albums = await cursor.fetch_list("SELECT album_id FROM r4_albums")
    i = 0
    for album_id in albums:
        txt = "Album %s / %s" % (i, len(albums))
        txt += " " * (80 - len(txt))
        print("\r" + txt, end="")
        i += 1

        a = Album.load_from_id(album_id)
        a.reconcile_sids()
        a.update_all_user_ratings()
        a.update_rating()
    print()
    print("Done")
