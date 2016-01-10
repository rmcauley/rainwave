import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import clear_updated_albums

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for enabling text search.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "If the queries fail, execute 'CREATE EXTENSION pg_trgm' as a database superuser."
	print
	print "Adding trigram search indexes to tables."

	db.c.update("CREATE INDEX song_title_trgm_gin ON r4_songs USING GIN(song_title_searchable gin_trgm_ops)")
	db.c.update("CREATE INDEX album_name_trgm_gin ON r4_albums USING GIN(album_name_searchable gin_trgm_ops)")
	db.c.update("CREATE INDEX artist_name_trgm_gin ON r4_artists USING GIN(artist_name_searchable gin_trgm_ops)")

	print "Done"