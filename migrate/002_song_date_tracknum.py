import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import Album
from rainwave.playlist_objects.album import clear_updated_albums

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for making album ratings station-specific.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "Adding columns to database..."

	db.c.update("ALTER TABLE r4_albums ADD album_year SMALLINT")
	db.c.update("ALTER TABLE r4_songs ADD song_track_number SMALLINT")
	db.c.update("ALTER TABLE r4_songs ADD song_disc_number SMALLINT")
	db.c.update("ALTER TABLE r4_songs ADD song_year SMALLINT")

	for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums ORDER BY album_id"):
		a = Album.load_from_id(album_id)
		# Will update the album year
		a.reconcile_sids()

	print "Done"