#!/usr/bin/python

import argparse
import sys

import api.server
import api.locale
from api_requests import *
import libs.buildtools
import libs.config

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	api.locale.load_translations()
	api.locale.compile_static_language_files()
	libs.config.load(args.config)
	libs.buildtools.bake_css()
	server = api.server.APIServer()
	sys.exit(server.start())
