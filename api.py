#!/usr/bin/python

import argparse
import sys

import api.server
import libs.config

# The following is the list of modules containing API requests:
from api_requests import test

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--test", action="store_true")
	parser.add_argument("--no-test", action="store_true")
	parser.add_argument("--config", default="api_test.conf")
	args = parser.parse_args()
	
	if args.no_test:
		libs.config.load(args.config)
		server = api.server.APIServer()
		server.start()
	else:
		libs.config.load("api_test.conf")
		server = api.server.APIServer()
		if server.test() == True:
			sys.exit(0)
		else:
			sys.exit(1)