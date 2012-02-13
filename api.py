#!/usr/bin/python

import argparse
import sys

import api.server
import libs.config

# The following is the list of modules containing API requests:
from api_requests import test

def run_api(config):
	libs.config.load(args.config)
	server = api.server.APIServer()
	server.start()
	return 0
	
def run_test(config):
	libs.config.load(config)
	server = api.server.APIServer()
	if server.test() == True:
		return 0
	else:
		return 1

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--test", action="store_true")
	parser.add_argument("--config", default="rainwave.conf")
	args = parser.parse_args()
		
	if args.test:
		sys.exit(run_test("rainwave_test.conf"))
	else:
		sys.exit(run_api(args.config))