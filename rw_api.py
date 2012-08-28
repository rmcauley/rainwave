#!/usr/bin/python

import argparse
import sys

import api.server
from api_requests import *

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default="rainwave.conf")
	args = parser.parse_args()
	libs.config.load(args.config)
	server = api.server.APIServer()
	sys.exit(server.start())