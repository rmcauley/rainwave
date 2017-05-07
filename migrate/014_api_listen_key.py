import argparse
import os
import sys
import string
import random

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for adding a listener key for each API key.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	db.connect()
	cache.connect()

	print "Making changes..."

	db.c.update("ALTER TABLE r4_api_keys DROP COLUMN api_ip")
	db.c.update("ALTER TABLE r4_api_keys ADD COLUMN api_key_listen_key TEXT")
	db.c.create_idx("r4_api_keys", "api_key")

	for key in db.c.fetch_list("SELECT api_key FROM r4_api_keys"):
		listen_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(10))
		db.c.update("UPDATE r4_api_keys SET api_key_listen_key = %s WHERE api_key = %s", (listen_key, key))

	print "Done"
