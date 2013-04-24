#!/usr/bin/python

import argparse
import sys

import api.server
from api_requests import *
import libs.buildtools
import libs.config

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	libs.config.load(args.config)
	libs.buildtools.bake_css()
	libs.buildtools.bake_languages()
	server = api.server.APIServer()
	sys.exit(server.start())