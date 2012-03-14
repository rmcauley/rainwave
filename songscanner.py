#!/usr/bin/python

import argparse

import backend.filemonitor
import libs

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
	parser.add_argument("--config", default="etc/rainwave_test.conf")
	args = parser.parse_args()
	libs.config.load(args.config)
	libs.log.init("%s/rw_scanner.log" % libs.config.get("log_dir"), libs.config.get("log_level"))
	libs.db.open()
	libs.cache.open()
	backend.filemonitor.start()