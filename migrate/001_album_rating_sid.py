import argparse
import sys

from libs import config
from libs import db

from rainwave.playlist_objects.album import Album

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for making album ratings station-specific.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)
	db.open()

	# TODO: reassign albums to the r4_songs table

	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating_count")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating REAL DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating_count INTEGER DEFAULT 0")

	album_faves = db.c.fetch_all("SELECT user_id, album_id, album_fave FROM r4_album_ratings WHERE album_fave = TRUE")
	db.c.update("TRUNCATE r4_album_ratings")
	db.c.update("ALTER TABLE r4_album_ratings ADD COLUMN SID SMALLINT NOT NULL")

	for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums"):
		a = Album.load_from_id(album_id)
		a.update_all_user_ratings()
		a.update_rating()

	# TODO: restore favourites