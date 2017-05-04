import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache

from rainwave.playlist import Album

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for making album ratings global.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	db.connect()
	cache.connect()

	print "Adding r4_album_faves table."

	# db.c.update(" \
	# 	CREATE TABLE r4_album_faves ( \
	# 		album_id				INTEGER		NOT NULL, \
	# 		user_id					INTEGER		NOT NULL, \
	# 		album_fave				BOOLEAN \
	# 	)")
	# # 			PRIMARY KEY (user_id, album_id, sid) \
	# db.c.create_idx("r4_album_faves", "user_id", "album_id", "sid") 	#Should be handled by primary key.
	# db.c.create_idx("r4_album_faves", "album_fave")
	# db.c.create_delete_fk("r4_album_faves", "r4_albums", "album_id", create_idx=False)
	# db.c.create_delete_fk("r4_album_faves", "phpbb_users", "user_id", create_idx=False)

	# print "Populating album_faves table..."

	# for row in db.c.fetch_all("SELECT album_id, user_id FROM r4_album_ratings WHERE album_fave = TRUE"):
	# 	if not db.c.fetch_var("SELECT COUNT(*) FROM r4_album_faves WHERE album_id = %s AND user_id = %s", (row['album_id'], row['user_id'])):
	# 		db.c.update("INSERT INTO r4_album_faves (album_id, user_id, album_fave) VALUES (%s, %s, TRUE)", (row['album_id'], row['user_id']))

	# print "Removing old column..."

	# db.c.update("ALTER TABLE r4_album_ratings DROP COLUMN album_fave")

	print "Recalculating ratings for testing..."
	for row in db.c.fetch_all("SELECT DISTINCT album_id, sid FROM r4_album_sid"):
		alb = Album.load_from_id_sid(row['album_id'], row['sid'])
		alb.update_all_user_ratings()
		alb.update_fave_count()

	print "Done"
