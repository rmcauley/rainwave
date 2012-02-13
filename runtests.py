#!/usr/bin/python

import sys
import nose
import api
from nose.plugins.base import Plugin

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

# I found Nose impossible to configure programmatically so I'm resorting
# to faking argv to pass in.  Terrible.  Absolutely terrible.
if nose.run(addplugins=[ExtensionPlugin()], argv=sys.argv.extend(['-w', 'tests', '-s'])) == 0:
	sys.stderr.write("Unit testing failed.")
	sys.exit(1)
	
sys.exit(api.run_test("etc/rainwave_test.conf"))