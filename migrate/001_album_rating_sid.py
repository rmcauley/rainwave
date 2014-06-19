import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db

from rainwave.playlist_objects.album import Album
from rainwave.playlist_objects.album import clear_updated_albums
from rainwave import rating

if __name__ == "__main__":
	try:
		parser = argparse.ArgumentParser(description="Rainwave DB migration script for making album ratings station-specific.")
		parser.add_argument("--config", default=None)
		args = parser.parse_args()
		config.load(args.config)

		for sid in config.station_ids:
			clear_updated_albums(sid)

		db.connect()
		db.c.start_transaction()

		print "Storing data..."
		song_to_album = {}
		for row in db.c.fetch_all("SELECT DISTINCT ON(song_id) song_id, album_id FROM r4_song_sid"):
			song_to_album[row['song_id']] = row['album_id']

		album_faves = db.c.fetch_all("SELECT user_id, album_id, album_fave FROM r4_album_ratings WHERE album_fave = TRUE")
		
		print "Adding columns to database..."

		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating REAL DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_rating_count INTEGER DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_fave_count INTEGER DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_request_count INTEGER DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_song_count SMALLINT DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_vote_count INTEGER DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_votes_seen INTEGER DEFAULT 0")
		db.c.update("ALTER TABLE r4_album_sid ADD COLUMN album_vote_share REAL")

		db.c.update("DELETE FROM r4_album_ratings")
		db.c.update("ALTER TABLE r4_album_ratings ADD COLUMN sid SMALLINT NOT NULL")
		# db.c.create_idx("r4_album_ratings", "user_id", "album_id")
		# db.c.create_idx("r4_album_ratings", "user_id", "album_id", "sid")
		# db.c.create_idx("r4_album_ratings", "sid")

		# db.c.create_idx("r4_song_ratings", "user_id", "song_id")

		db.c.update("ALTER TABLE r4_songs ADD album_id INTEGER")
		# db.c.create_null_fk("r4_songs", "r4_albums", "album_id")

		print "Updating song records..."
		for song_id, album_id in song_to_album.iteritems():
			db.c.update("UPDATE r4_songs SET album_id = %s WHERE song_id = %s", (album_id, song_id))

		for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums ORDER BY album_name"):
			a = Album.load_from_id(album_id)
			print "Updating %s..." % a.data['name']
			a.reconcile_sids()
			for sid in config.station_ids:
				a.reset_user_completed_flags(sid)
				a.update_request_count(sid)
				a.update_vote_count(sid)
			a.update_all_user_ratings()
			a.update_rating()

		print
		print "Re-applying favourites..."
		for row in album_faves:
			for sid in config.station_ids:
				rating.set_album_fave(sid, row['album_id'], row['user_id'], True)
		
		for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums"):
			for sid in config.station_ids:
				Album.load_from_id(album_id).update_fave_count(sid)

		print "Removing old columns..."
		db.c.update("ALTER TABLE r4_song_sid DROP COLUMN album_id")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_rating_count")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_fave_count")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_request_count")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_song_count")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_vote_count")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_votes_seen")
		db.c.update("ALTER TABLE r4_albums DROP COLUMN album_vote_share")
		db.c.commit()
	except:
		db.c.rollback()
		raise
