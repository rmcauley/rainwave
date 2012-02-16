#!/usr/bin/python

import os
import sys
import tempfile
import nose
from nose.plugins.base import Plugin

import libs.config
import libs.db
import api.server

from api_requests import *

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
libs.config.test_mode = True
sqlite_file = "%s/rwapi_test.sqlite" % tempfile.gettempdir()
if os.path.exists(sqlite_file):
	os.remove(sqlite_file)
		
libs.config.load("etc/rainwave_test.conf")
libs.config.override("db_type", "sqlite")
libs.config.override("db_name", sqlite_file)
libs.db.open()
libs.db.create_tables()

# I found Nose impossible to configure programmatically so I'm resorting
# to faking argv to pass in.  Terrible.  Absolutely terrible.
if nose.run(addplugins=[ExtensionPlugin()], argv=sys.argv.extend(['-w', 'tests', '-s'])) == 0:
	sys.stderr.write("Unit testing failed.\n")
	sys.exit(1)
	
libs.db.close()

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