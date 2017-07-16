#!/usr/bin/python

# this include has to go first so ZMQ can steal IOLoop installation from Tornado
import libs.zeromq

import argparse

import backend.server
import libs.chuser
import libs.log
import libs.config

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave backend daemon.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	libs.config.load(args.config)

	server = backend.server.BackendServer()
	server.start()
