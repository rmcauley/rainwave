import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import clear_updated_albums

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for adding schedule IDs to elections.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "Adding album_newest_song_time."

	db.c.update("ALTER TABLE r4_albums ADD album_newest_song_time INT DEFAULT 0")

	print "Updating album_newest_song_time."

	for row in db.c.fetch_all("SELECT album_id, MAX(song_added_on) AS added_on FROM r4_songs GROUP BY album_id"):
		db.c.update("UPDATE r4_albums SET album_newest_song_time = %s WHERE album_id = %s", (row['added_on'], row['album_id']))

	print "Done"