#!/usr/bin/python

import httplib
import urllib
import argparse
import os.path
import time
from libs import cache
from libs import config

parser = argparse.ArgumentParser(description="Fetches the next song from a Rainwave backend daemon.")
parser.add_argument("--dest", "-d", required=False, default="127.0.0.1")
parser.add_argument("--sid", "-s", required=False, default=1)
parser.add_argument("--config", "-c", required=False, default=None)
args = parser.parse_args()

config.load(args.config)
cache.open()

params = urllib.urlencode({ "sid": args.sid })
try:
	conn = httplib.HTTPConnection(args.dest, config.get("backend_port"), timeout=10)
	conn.request("GET", "/advance/%s" % args.sid)
	result = conn.getresponse()
	if result.status == 200:
		print result.read()
	else:
		raise Exception("Backend HTTP Error %s" % result.status)
	cache.set_station(args.sid, "backend_ok", True)
	cache.set_station(args.sid, "backend_message", "OK")
	conn.close()
except Exception as e:
	cache.set_station(args.sid, "backend_ok", False)
	cache.set_station(args.sid, "backend_status", repr(e))
	if conn:
		conn.close()
	time.sleep(3)
	raise
