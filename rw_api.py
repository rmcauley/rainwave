#!/usr/bin/python

# this include has to go first so ZMQ can steal IOLoop installation from Tornado
import libs.zeromq
libs.zeromq.install_ioloop()

import argparse
import sys

#pylint: disable=W0614,W0401
import api.server
from api_requests import *
from api_requests.admin import *
from api_requests.admin_web import *
import libs.config
#pylint: enable=W0614,W0401

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	libs.config.load(args.config)
	server = api.server.APIServer()
	sys.exit(server.start())
