import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import clear_updated_albums

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for saving user preferences.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "Adding table to database..."

	db.c.update(" \
		CREATE TABLE r4_pref_storage ( \
			user_id 				INT 		, \
			ip_address 				TEXT 		, \
			prefs 					JSONB \
		)")
	db.c.create_delete_fk("r4_pref_storage", "phpbb_users", "user_id")

	print "Done"