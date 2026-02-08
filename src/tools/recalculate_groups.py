#!/usr/bin/env python

import argparse

from libs import config
from common.libs import db
from libs import log
from common.rainwave.playlist import SongGroup

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reconciles song<>group data.")
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    config.load(args.config)
    log.init()
    db.connect()

    groups = await cursor.fetch_list("SELECT group_id FROM r4_groups")
    i = 0
    for group_id in groups:
        txt = "Group %s / %s" % (i, len(groups))
        txt += " " * (80 - len(txt))
        print("\r" + txt, end="")
        i += 1

        g = SongGroup.load_from_id(group_id)
        g.reconcile_sids()
