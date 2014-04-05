#!/usr/bin/python

import argparse

import backend.filemonitor
import libs.config
import libs.log
import libs.db
import libs.cache
import libs.chuser
import rainwave.playlist

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
	parser.add_argument("--config", default=None)
	parser.add_argument("--full", action="store_true")
	parser.add_argument("--art", action="store_true")
	args = parser.parse_args()
	libs.config.load(args.config)
	if libs.config.get("log_level") == "print":
		libs.log.init("%s/rw_scanner.log" % libs.config.get("log_dir"), "debug")
	else:
		libs.log.init("%s/rw_scanner.log" % libs.config.get("log_dir"), libs.config.get("log_level"))
	libs.db.open()
	libs.cache.open()

	for sid in libs.config.station_ids:
		rainwave.playlist.clear_updated_albums(sid)

	if libs.config.get("scanner_user") and libs.config.get("scanner_group"):
		libs.chuser.change_user(libs.config.get("scanner_user"), libs.config.get("scanner_group"))

	try:
		if args.art:
			print "Scanning art..."
			backend.filemonitor.start(art_scan=True)
		else:
			backend.filemonitor.start(full_scan=args.full)
	finally:
		libs.db.close()
		libs.log.close()
