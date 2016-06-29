#!/usr/bin/python

import argparse
import shutil
import os

from libs import config
from libs import db
from libs import cache

from rainwave.playlist_objects import Song

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

	remove_songs = db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid != %s", (REMOVE_THRESHOLD, REQONLY_STATION))
	reqonly_songs = db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating > %s AND song_rating <= %s", (REMOVE_THRESHOLD, REQONLY_THRESHOLD))

	if REQONLY_STATION:
		reqonly_songs += db.c.fetch_all("SELECT song_id, song_origin_sid, song_filename FROM r4_songs WHERE song_rating <= %s AND song_origin_sid = %s", (REMOVE_THRESHOLD, REQONLY_STATION))

	for row in remove_songs:
		fn = row['song_filename'].split(os.sep)[-1]
		os.makedirs(args.moveto + "/" + row['song_origin_sid'])
		shutil.move(row, args.moveto + "/" + row['song_origin_sid'] + "/" + row['song_filename'])

		song = Song.load_from_id(row['song_id'])
		song.disable()

	for row in reqonly_songs:
		db.c.update("UPDATE r4_song_sid SET song_request_only = TRUE WHERE song_id = %s", row['song_id'])