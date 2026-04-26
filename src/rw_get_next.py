import argparse
from http.client import HTTPConnection
from common import config

parser = argparse.ArgumentParser(
    description="Fetches the next song from a Rainwave backend daemon."
)
parser.add_argument("--dest", "-d", required=False, default="127.0.0.1")
parser.add_argument("--sid", "-s", required=False, default=1)
parser.add_argument("--config", "-c", required=False, default=None)
args = parser.parse_args()

conn = None
try:
    dest_port = config.backend_port
    dest_port += int(args.sid)
    timeout = 5
    conn = HTTPConnection(args.dest, dest_port, timeout=timeout)
    conn.request("GET", "/advance/%s" % args.sid)
    result = conn.getresponse()
    if result.status == 200:
        next_song_filename = result.read()
        if not next_song_filename or len(next_song_filename) == 0:
            raise Exception("Got zero-length filename from backend!")
        print(next_song_filename.decode("utf-8"))
    else:
        raise Exception("HTTP Error %s trying to reach backend!" % result.status)
finally:
    if conn:
        conn.close()
