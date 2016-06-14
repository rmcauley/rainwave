import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir)))

from libs import config
from libs import db
from libs import cache

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave DB migration script for request line improvements.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	config.load(args.config)

	db.connect()
	cache.connect()

	print "Adding line_has_had_valid to r4_request_line."

	db.c.update("ALTER TABLE r4_request_line ADD line_has_had_valid BOOLEAN DEFAULT FALSE")

	print "Done"
