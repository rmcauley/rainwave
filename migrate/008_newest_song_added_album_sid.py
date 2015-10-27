import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import clear_updated_albums

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for moving album_newest_song_time to r4_album_sid.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "Adding album_newest_song_time."

	db.c.update("ALTER TABLE r4_album_sid ADD album_newest_song_time INT DEFAULT 0")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_newest_song_time")

	print "Updating album_newest_song_time for r4_album_sid."

	for sid in config.station_ids:
		for row in db.c.fetch_all("SELECT album_id, MAX(song_added_on) AS added_on FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE sid = %s GROUP BY album_id", (sid,)):
			db.c.update("UPDATE r4_album_sid SET album_newest_song_time = %s WHERE album_id = %s AND sid = %s", (row['added_on'], row['album_id'], sid))

	print "Done"