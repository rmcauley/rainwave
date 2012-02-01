#!/usr/bin/python

import argparse

import backend.filemonitor
import libs.config
import libs.log
import libs.db

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave song scanning daemon.")
	parser.add_argument("--config", default="api_test.conf")
	args = parser.parse_args()
	libs.config.load(args.config)
	libs.log.init("%s/scanner.log" % libs.config.get("log_dir"), libs.config.get("log_level"))
	libs.db.open()
	backend.filemonitor.start()