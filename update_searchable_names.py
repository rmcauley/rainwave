# Updates the "searchable names" fields in the database that are used for full-text searches

from libs import config
from libs import db
from rainwave import playlist
config.load()
db.open()

for row in db.c.fetch_all("SELECT song_id, song_title FROM r4_songs"):
	db.c.update("UPDATE r4_songs SET song_title_searchable = %s WHERE song_id = %s", (playlist.make_searchable_string(row['song_title']), row['song_id']))

for row in db.c.fetch_all("SELECT album_id, album_name FROM r4_albums"):
	db.c.update("UPDATE r4_albums SET album_name_searchable = %s WHERE album_id = %s", (playlist.make_searchable_string(row['album_name']), row['album_id']))