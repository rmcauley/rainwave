#!/usr/bin/env python

import argparse
import os
import sys

import libs.db

parser = argparse.ArgumentParser(
    description="Dumps data to /tmp/rwstats in CSV format from SQL. Dangerous script in many, many ways - needs Postgres superuser permissions."
)
parser.add_argument("--config", default=None)
parser.add_argument("--sid", type=int)
args = parser.parse_args()

# Before running this script you're going to need pseudo_encrypt in the database:
"""
CREATE OR REPLACE FUNCTION pseudo_encrypt(VALUE int) returns int AS $$
DECLARE
l1 int;
l2 int;
r1 int;
r2 int;
i int:=0;
BEGIN
 l1:= (VALUE >> 16) & 65535;
 r1:= VALUE & 65535;
 WHILE i < 3 LOOP
   l2 := r1;
   r2 := l1 # ((((1366 * r1 + 150889) % 714025) / 714025.0) * 32767)::int;
   l1 := l2;
   r1 := r2;
   i := i + 1;
 END LOOP;
 RETURN ((r1 << 16) + l1);
END;
$$ LANGUAGE plpgsql strict immutable;
"""

libs.config.load(args.config)
libs.db.connect()

tables = [
    "r4_album_ratings",
    "r4_album_sid",
    "r4_albums",
    "r4_artists",
    "r4_election_entries",
    "r4_elections",
    "r4_groups",
    "r4_listeners",
    "r4_listener_counts",
    "r4_one_ups",
    "r4_request_history",
    "r4_request_line",
    "r4_request_store",
    "r4_schedule",
    "r4_song_artist",
    "r4_song_group",
    "r4_song_ratings",
    "r4_song_sid",
    "r4_songs",
    "r4_vote_history",
]

if not os.path.exists("/tmp/rwstats"):
    print("Make sure /tmp/rwstats exists and is world writable.")
else:
    for table in tables:
        print(table)
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
        libs.db.c.update(
            "COPY (%s) TO '/tmp/rwstats/%s.csv' WITH CSV HEADER" % (query, table)
        )
