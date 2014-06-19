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

	song_to_album = {}
	for row in db.c.fetch_all("SELECT DISTINCT ON(song_id) song_id, album_id FROM r4_song_sid"):
		song_to_album[row['song_id']] = row['album_id']

	album_data = {}
	for row in db.c.fetch_all("SELECT album_id, album_vote_count, album_votes_seen, album_vote_share"):
		album_data[row['album_id']] = row

	album_faves = db.c.fetch_all("SELECT user_id, album_id, album_fave FROM r4_album_ratings WHERE album_fave = TRUE")
	
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating_count")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_fave_count")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_song_count")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_vote_count")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_votes_seen")
	db.c.update("ALTER TABLE r4_albums DROP COLUMN album_vote_share")

	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating REAL DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating_count INTEGER DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_fave_count INTEGER DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_song_count SMALLINT DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_vote_count INTEGER DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_votes_seen INTEGER DEFAULT 0")
	db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_vote_share REAL")

	db.c.update("TRUNCATE r4_album_ratings")
	db.c.update("ALTER TABLE r4_album_ratings ADD COLUMN SID SMALLINT NOT NULL")
	db.c.create_idx("r4_album_ratings", "user_id", "album_id")
	db.c.create_idx("r4_album_ratings", "user_id", "album_id", "sid")
	db.c.create_idx("r4_album_ratings", "sid")

	for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums"):
		a = Album.load_from_id(album_id)
		a.update_all_user_ratings()
		a.update_rating()

	db.c.create_idx("r4_song_ratings", "user_id", "song_id")

	# TODO: restore favourites