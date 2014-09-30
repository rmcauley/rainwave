#!/usr/bin/python

import os
import shutil
import subprocess

from libs import buildtools

if os.getuid() != 0:
	raise Exception("Installer must be run as root.")

installdir = "/opt/rainwave"
user = "rainwave"
group = "www-data"
tmpdir = "/tmp/rw_install"

if not os.path.exists("/etc/rainwave.conf"):
	raise Exception("Configuration not found at /etc/rainwave.conf.  Please create a config.")

if os.path.exists("/etc/init.d/rainwave"):
	subprocess.check_call([ "/etc/init.d/rainwave", "stop" ])
if os.path.exists(tmpdir):
	shutil.rmtree(tmpdir)
if os.path.exists(os.path.join(installdir, "static", "baked")):
	os.makedirs(os.path.join(tmpdir, "static"))
	shutil.copytree(os.path.join(installdir, "static", "baked"), os.path.join(tmpdir, "static", "baked"))
shutil.rmtree(installdir)
os.makedirs(installdir)
if not os.path.isdir(installdir):
	raise Exception("Installation directory (%s) appears to be a filename.  Please check." % installdir)

shutil.copytree("api", installdir + "/api", ignore=shutil.ignore_patterns("*.pyc"))
shutil.copytree("api_requests", installdir + "/api_requests", ignore=shutil.ignore_patterns("*.pyc"))
shutil.copytree("backend", installdir + "/backend", ignore=shutil.ignore_patterns("*.pyc"))
shutil.copytree("lang", installdir + "/lang")
shutil.copytree("libs", installdir + "/libs", ignore=shutil.ignore_patterns("*.pyc"))
shutil.copytree("rainwave", installdir + "/rainwave", ignore=shutil.ignore_patterns("*.pyc"))
shutil.copytree("etc", installdir + "/etc")
shutil.copytree("static", installdir + "/static")
shutil.copytree("templates", installdir + "/templates")

shutil.copy("rw_api.py", installdir + "/rw_api.py")
shutil.copy("rw_backend.py", installdir + "/rw_backend.py")
shutil.copy("rw_scanner.py", installdir + "/rw_scanner.py")
shutil.copy("rw_clear_cache.py", installdir + "/rw_clear_cache.py")
shutil.copy("rw_get_next.py", installdir + "/rw_get_next.py")
shutil.copy("rw_icecast_sync.py", installdir + "/rw_icecast_sync.py")
shutil.copy("tagset.py", installdir + "/tagset.py")

shutil.copy("initscript", "/etc/init.d/rainwave")
shutil.copy("rw_get_next.py", "/usr/local/bin/rw_get_next.py")

shutil.rmtree(os.path.join(installdir, "static", "baked"))

if os.path.exists(tmpdir):
	shutil.copytree(os.path.join(tmpdir, "static", "baked"), os.path.join(installdir, "static", "baked"))
if not os.path.exists(os.path.join(installdir, "static", "baked", str(buildtools.get_build_number()))):
	os.makedirs(os.path.join(installdir, "static", "baked", str(buildtools.get_build_number())))

subprocess.call(["chown", "-R", "%s:%s" % (user, group), installdir ])

print "Rainwave installed to /opt/rainwave."

if os.path.exists("/etc/init.d/rainwave"):
	subprocess.check_call([ "/etc/init.d/rainwave", "start" ])
