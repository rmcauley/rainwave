import json
import argparse
import time
import socket
from http.client import HTTPConnection
from urllib import parse
from backend.cache import cache
from src.backend import config

parser = argparse.ArgumentParser(
    description="Fetches the next song from a Rainwave backend daemon."
)
parser.add_argument("--dest", "-d", required=False, default="127.0.0.1")
parser.add_argument("--sid", "-s", required=False, default=1)
parser.add_argument("--config", "-c", required=False, default=None)
args = parser.parse_args()

cache.connect()

conn = None
params = parse.quote(json.dumps({"sid": args.sid}))
try:
    dest_port = config.song_change_api_port
    dest_port += int(args.sid)
    timeout = 5 if cache.get_station(args.sid, "backend_ok") else 120
    conn = HTTPConnection(
        args.dest, config.song_change_api_port + int(args.sid), timeout=timeout
    )
    conn.request("GET", "/advance/%s" % args.sid)
    result = conn.getresponse()
    if result.status == 200:
        next_song_filename = result.read()
        if not next_song_filename or len(next_song_filename) == 0:
            raise Exception("Got zero-length filename from backend!")
        print(next_song_filename.decode("utf-8"))
    else:
        raise Exception("HTTP Error %s trying to reach backend!" % result.status)
    cache.set_station(args.sid, "backend_ok", True)
    cache.set_station(args.sid, "backend_message", "OK")
    conn.close()
except socket.timeout as e:
    cache.set_station(args.sid, "backend_ok", False)
    cache.set_station(args.sid, "backend_status", repr(e))
    time.sleep(2)
    raise
except Exception as e:
    cache.set_station(args.sid, "backend_ok", False)
    cache.set_station(args.sid, "backend_status", repr(e))
    if conn:
        conn.close()
    time.sleep(2)
    raise
