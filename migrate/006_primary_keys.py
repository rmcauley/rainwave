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

	print "Altering constraints and indexes."

	db.c.update("ALTER TABLE r4_song_sid ADD PRIMARY KEY (song_id, sid)")
	db.c.update("DROP INDEX r4_song_ratings_user_id_song_id_idx")
	try:
		db.c.update("ALTER TABLE r4_song_ratings ADD PRIMARY KEY USING INDEX r4_song_ratings_user_id_song_id_idx")
	except:
		db.c.update("ALTER TABLE r4_song_ratings ADD PRIMARY KEY (song_id, user_id)")
	db.c.update("ALTER TABLE r4_album_sid ADD PRIMARY KEY (album_id, sid)")
	db.c.update("DROP INDEX r4_album_ratings_user_id_album_id_idx")
	try:
		db.c.update("ALTER TABLE r4_album_ratings ADD PRIMARY KEY USING INDEX r4_album_ratings_user_id_album_id_sid_idx")
	except:
		db.c.update("ALTER TABLE r4_album_ratings ADD PRIMARY KEY (album_id, sid, user_id)")
	db.c.update("ALTER TABLE r4_song_artist ADD PRIMARY KEY (artist_id, song_id)")
	db.c.update("ALTER TABLE r4_song_group ADD PRIMARY KEY (group_id, song_id)")

	print "Done"