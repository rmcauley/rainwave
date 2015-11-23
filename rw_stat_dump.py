#!/usr/bin/python

import argparse
import os
import sys

import libs.db
import rainwave.playlist

parser = argparse.ArgumentParser(description="Dumps data to /tmp/rwstats in CSV format from SQL")
parser.add_argument("--config", default=None)
parser.add_argument("--sid", type=int)
args = parser.parse_args()

libs.config.load(args.config)
libs.db.connect()

tables = [
	'r4_album_ratings',
	'r4_album_sid',
	'r4_albums',
	'r4_artists',
	'r4_election_entries',
	'r4_elections',
	'r4_groups',
	'r4_listeners',
	'r4_listener_counts',
	'r4_one_ups',
	'r4_request_history',
	'r4_request_line',
	'r4_request_store',
	'r4_schedule',
	'r4_song_artist',
	'r4_song_group',
	'r4_song_ratings',
	'r4_song_sid',
	'r4_songs',
	'r4_vote_history'
]

os.mkdir("/tmp/rwstats")

for table in tables:
	print table
	sys.stdout.flush()
	query = libs.db.c.fetch_var(
		"SELECT "
			"'SELECT ' || "
				"ARRAY_TO_STRING(ARRAY(SELECT CASE WHEN COLUMN_NAME::VARCHAR(50)='user_id' THEN 'pseudo_encrypt(user_id) AS user_id' ELSE COLUMN_NAME::VARCHAR(50) END  "
    		"FROM INFORMATION_SCHEMA.COLUMNS "
    		"WHERE TABLE_NAME='%s' AND "
            "COLUMN_NAME NOT IN ('col2') "
    		"ORDER BY ORDINAL_POSITION "
		"), ', ') || ' FROM %s'" % (table, table)
	)
	libs.db.c.update("COPY (%s) TO '/tmp/rwstats/%s.csv' WITH CSV" % (table, table))