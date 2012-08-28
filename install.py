#!/usr/bin/python

import os
import shutil
from subprocess import call

from libs import config

if getuid() != 0:
	raise "Installer must be run as root."

installdir = "/opt/rainwave"
user = "rainwave"
group = "rainwave"

if not os.path.exists("/etc/rainwave.conf")

if not os.path.exists(installdir):
	os.makedirs(installdir)
elif not os.path.isdir(installdir):
	raise "Installation directory (%s) appears to be a filename.  Please check." % installdir

shutil.copytree(".", installdir, ignore=shutil.ignore_patterns("*.pyc", "etc", ".git", "api_tests", "tests"))
shutil.copy("initscript", "/etc/init.d/rainwave")
shutil.copy("rw_get_next.py", "/usr/local/bin/rw_get_next.py")
# TODO: What to do with tagset.py and icecast_sync.py/
call([ "/etc/init.d/rainwave stop", "/etc/init.d/rainwave start" ])
