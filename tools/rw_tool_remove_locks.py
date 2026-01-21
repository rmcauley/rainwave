#!/usr/bin/env python

import argparse

import libs.config
import libs.log
import libs.db
import rainwave.playlist

parser = argparse.ArgumentParser(description="Removes all election and cooldown data.")
parser.add_argument("--config", default=None)
parser.add_argument("--sid", type=int)
args = parser.parse_args()
libs.config.load(args.config)
libs.log.init()
libs.db.connect()
rainwave.playlist.remove_all_locks(args.sid)
