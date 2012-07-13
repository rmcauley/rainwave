#!/usr/bin/python

# TODO: This needs to be tested
# TODO: If the connection fails/times out, set a memcache variable to signal the station as offline

import httplib
import urllib
import argparse

parser = argparse.ArgumentParser(description="Rainwave backend daemon.")
parser.add_argument("--host", "-h", required=True)
parser.add_argument("--port", "-p", required=True)
parser.add_argument("--sid", "-s", required=True)
args = parser.parse_args()

params = urllib.urlencode({ "sid": sid })
conn = httplib.HTTPConnection('localhost', args.host, args.port)
conn.request("GET", "/advance/%s" % args.sid)
result = conn.getresponse()
print result.read()
