#!/usr/bin/python

import argparse
from libs import config
from libs import db
from libs import cache
from libs import log
from backend import icecast_sync

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)
	log_file = "%s/rw_icecast_sync.log" % (config.get_directory("log_dir"),)
	log.init(log_file, config.get("log_level"))
	db.connect()
	cache.connect()
	icecast_sync.start_icecast_sync()
