import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache
from rainwave.playlist_objects.album import clear_updated_albums
from rainwave.playlist_objects.songgroup import SongGroup

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for speeding up text searches by adding an index.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	for sid in config.station_ids:
		clear_updated_albums(sid)

	db.connect()
	cache.connect()

	print "Adding r4_group_sid table."

	db._create_group_sid_table()

	print "Populating r4_group_sid."

	for group_id in db.c.fetch_list("SELECT group_id FROM r4_groups"):
		g = SongGroup.load_from_id(group_id)
		g.reconcile_sids()

	print "Done"
