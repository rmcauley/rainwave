#!/usr/bin/python

# TODO: This needs to be tested
# TODO: If the connection fails/times out, set a memcache variable to signal the station as offline

import httplib
import urllib
import argparse

parser = argparse.ArgumentParser(description="Fetches the next song from a Rainwave backend daemon.")
parser.add_argument("--dest", "-d", required=False, default="127.0.0.1")
parser.add_argument("--port", "-p", required=True, type=int)
parser.add_argument("--sid", "-s", required=True)
args = parser.parse_args()

params = urllib.urlencode({ "sid": args.sid })
conn = httplib.HTTPConnection(args.dest, args.port)
conn.request("GET", "/advance/%s" % args.sid)
result = conn.getresponse()
print result.read()
