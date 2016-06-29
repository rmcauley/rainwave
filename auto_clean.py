#!/usr/bin/python

import argparse
import shutil
import os
import errno

from libs import config
from libs import db
from libs import cache

from rainwave.playlist_objects.song import Song

def mkdir_p(path):
	try:
		os.makedirs(path)
	except OSError as exc:  # Python >2.5
		if exc.errno == errno.EEXIST and os.path.isdir(path):
			pass
		else:
			raise

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave auto-song cleanup.  WARNING: This script hardcoded for Rainwave's setup!  Please edit the code before using!")
	parser.add_argument("--config", default=None, required=True)
	parser.add_argument("--moveto", default=None, required=True)
	args = parser.parse_args()
	config.load(args.config)
	db.connect()
	cache.connect()

	REMOVE_THRESHOLD = 3.0
	REQONLY_THRESHOLD = 3.3
	REQONLY_STATION = 2

	remove_songs = db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid != %s AND song_verified = TRUE", (REMOVE_THRESHOLD, REQONLY_STATION))
	reqonly_songs = db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating > %s AND song_rating <= %s AND song_verified = TRUE", (REMOVE_THRESHOLD, REQONLY_THRESHOLD))

	if REQONLY_STATION:
		reqonly_songs += db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid = %s AND song_verified = TRUE", (REMOVE_THRESHOLD, REQONLY_STATION))

	for row in remove_songs:
		fn = row['song_filename'].split(os.sep)[-1]
		os.makedirs("%s%s%s" % (args.moveto, os.sep, row['song_origin_sid']))
		shutil.move(row, "%s%s%s%s%s" % (args.moveto, os.sep, row['song_origin_sid'], os.sep, row['song_filename']))

		song = Song.load_from_id(row['song_id'])
		song.disable()

		print "Disabled: %s" % row['song_filename']

	for row in reqonly_songs:
		db.c.update("UPDATE r4_song_sid SET song_request_only = TRUE WHERE song_id = %s", row['song_id'])
		print "Req Only: %s" % row['song_filename']