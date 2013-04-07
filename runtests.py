#!/usr/bin/python

import os
import sys
import tempfile
import argparse
import nose
from nose.plugins.base import Plugin

import libs.config
import libs.db
import libs.cache
import api.server
import libs.log
import rainwave.playlist
import rainwave.event
import rainwave.request

from api_requests import *

parser = argparse.ArgumentParser(description="Rainwave unit and API testing.")
parser.add_argument("--api", action="store_true")
parser.add_argument("--apionly", action="store_true")
parser.add_argument("--config", default=None)
args = parser.parse_args()

# Taken from http://stackoverflow.com/questions/3670515/how-to-make-py-test-or-nose-to-look-for-tests-inside-all-python-files
# IT SHOULDN'T BE THIS DIFFICULT TO DO WHAT I WANT NOSE TO DO
class ExtensionPlugin(Plugin):
    name = "ExtensionPlugin"

    def options(self, parser, env):
        Plugin.options(self,parser,env)

    def configure(self, options, config):
        Plugin.configure(self, options, config)
        self.enabled = True

    def wantFile(self, file):
        return file.endswith('.py')

    def wantDirectory(self,directory):
        return True

    def wantModule(self,file):
        return True
		
# Setup our run environment for the test.
username = os.environ.get("USERNAME") #os.environ['USER']
sqlite_file = "%s/rw_test.%s.sqlite" % (tempfile.gettempdir(), username)
if os.path.exists(sqlite_file):
	os.remove(sqlite_file)
	
if args.config:
    libs.config.load(args.config, testmode=True)
else:
    libs.config.load("etc/%s.conf" % username, testmode=True)
		
if not args.apionly:
	if libs.config.get("db_type") == "sqlite":
		libs.config.override("db_name", sqlite_file)
	libs.db.open()
	if libs.config.get("db_type") == "sqlite":
	    libs.db.create_tables()
	libs.cache.open()
	libs.log.init("%s/rw_backend.%s.log" % (libs.config.get("log_dir"), username), libs.config.get("log_level"))

	libs.cache.set_station(1, "sched_current", rainwave.event.Event())
	rainwave.request.update_cache(1)
	rainwave.playlist.prepare_cooldown_algorithm(1)
	libs.cache.update_local_cache_for_sid(1)
	libs.cache.set("listeners_internal", {})

	# Prevents KeyError from occurring in playlist
	for sid in range(1, 10):
		rainwave.playlist.clear_updated_albums(sid)

	# I found Nose impossible to configure programmatically so I'm resorting
	# to faking argv to pass in.  Terrible.  Absolutely terrible.
	if nose.run(addplugins=[ExtensionPlugin()], argv=['-w', 'tests', '-s']) == 0:
		sys.stderr.write("Unit testing failed.\n")
	#	sys.exit(1)
		
	libs.db.close()

if args.api or args.apionly:
	print

	server = api.server.APIServer()
	try:
		passed = server.test()
		if passed:
			sys.exit(0)
		else:
			sys.exit(1)
	except RuntimeError as (err):
		print
		if repr(err).index("Too many child restarts"):
			print "Internal server errors - please view log file in /tmp."
		else:
			raise
		sys.exit(1)

sys.exit(0)
