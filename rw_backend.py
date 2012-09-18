#!/usr/bin/python

import argparse
import sys
import os

import backend.server
import libs.chuser
import libs.log
import libs.config

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave backend daemon.")
	parser.add_argument("--config", default="rainwave.conf")
	args = parser.parse_args()
	libs.config.load(args.config)
	
	pid = os.getpid()
	pidfile = open(libs.config.get("backend_pid_file"), 'w')
	pidfile.write(str(pid))
	pidfile.close()
	
	libs.log.init("%s/rw_backend.log" % libs.config.get("log_dir"), libs.config.get("log_level"))
	
	sys.exit(backend.server.start())
