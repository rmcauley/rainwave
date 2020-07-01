#!/usr/bin/env python

# Updates the "searchable names" fields in the database that are used for full-text searches

from libs import config
from libs import db
from rainwave.playlist_objects.song import make_searchable_string

config.load()
db.connect()

for row in db.c.fetch_all("SELECT song_id, song_title FROM r4_songs"):
    db.c.update(
        "UPDATE r4_songs SET song_title_searchable = %s WHERE song_id = %s",
        (make_searchable_string(row["song_title"]), row["song_id"]),
    )

for row in db.c.fetch_all("SELECT album_id, album_name FROM r4_albums"):
    db.c.update(
        "UPDATE r4_albums SET album_name_searchable = %s WHERE album_id = %s",
        (make_searchable_string(row["album_name"]), row["album_id"]),
    )

for row in db.c.fetch_all("SELECT group_id, group_name FROM r4_groups"):
    db.c.update(
        "UPDATE r4_groups SET group_name_searchable = %s WHERE group_id = %s",
        (make_searchable_string(row["group_name"]), row["group_id"]),
    )

for row in db.c.fetch_all("SELECT artist_id, artist_name FROM r4_artists"):
    db.c.update(
        "UPDATE r4_artists SET artist_name_searchable = %s WHERE artist_id = %s",
        (make_searchable_string(row["artist_name"]), row["artist_id"]),
    )
