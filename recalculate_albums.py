import argparse

from libs import config
from libs import db
from rainwave.playlist import Album

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave API server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)
	db.connect()

	albums = db.c.fetch_list("SELECT album_id FROM r4_albums")
	i = 0
	for album_id in albums:
		txt = "Album %s / %s" % (i, len(albums))
		txt += " " * (80 - len(txt))
		print "\r" + txt,
		i += 1
		
		a = Album.load_from_id(album_id)
		a.reconcile_sids()
		a.update_all_user_ratings()
		a.update_rating()
