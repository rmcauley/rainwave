#!/usr/bin/python

import os
import sys

from libs import config
from libs import db
import rainwave.playlist

# Step 1: db_init.py
# Step 2: rw_scanner.py --full
# Step 3: this script
	
config.load()
db.open()

class R3Song(rainwave.playlist.Song):
	def load_r3_data(self):
		r3_data = db.c.fetch_row("SELECT song_id, MIN(song_addedon) AS song_added_on, SUM(song_totalrequests) AS song_request_count, MAX(song_oa_multiplier) AS song_cool_multiply, MAX(song_oa_override) AS song_cool_override, MAX(song_rating_id) AS song_rating_id FROM rw_songs WHERE song_filename = %s AND r4_song_id IS NULL GROUP BY (song_filename)", (self.filename,))
		db.c.update("UPDATE rw_songs SET r4_song_id = %s WHERE song_id = %s", (self.id, r3_data['song_id']))
		db.c.update("UPDATE r4_songs SET song_request_count = %s, song_added_on = %s, song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s", (r3_data['song_request_count'], r3_data['song_added_on'], r3_data['song_cool_multiply'], r3_data['song_cool_override'], self.id))
		
		for row in db.c.fetch_all("SELECT rw_songratings.*, rw_songfavourites.user_id AS song_fav FROM rw_songratings LEFT JOIN rw_songfavourites ON (rw_songratings.user_id = rw_songfavourites.user_id AND rw_songratings.song_rating_id = rw_songfavourites.song_rating_id) WHERE rw_songratings.song_rating_id = %s", (r3_data['song_rating_id'],)):
			is_fav = True if row['song_fav'] else False
			db.c.update("INSERT INTO r4_song_ratings(song_id, user_id, song_rated_at, song_rated_at_rank, song_rated_at_count, song_fave) "
						" VALUES (%s, %s, %s, %s, %s, %s)",
						(self.id, row['user_id'], row['song_rated_at'], row['user_rating_rank'], row['user_rating_snapshot'], is_fav))
			
class R3Album(rainwave.playlist.Album):
	def load_r3_data(self):
		album_ids = db.c.fetch_list("SELECT album_id FROM rw_albums WHERE album_name = %s", (self.data['name'],))
		for album_id in album_ids:
			for fav in db.c.fetch_list("SELECT user_id FROM rw_albumfavourites WHERE album_id = %s", (album_id,)):
				db.c.update("INSERT INTO r4_album_ratings(user_id, album_id, album_fave) VALUES (%s, %s, %s)", (fav, self.id, True))
				
for song_id in db.c.fetch_list("SELECT song_id FROM r4_songs"):
	song = R3Song.load_from_id(song_id)
	song.load_r3_data()
	
for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums"):
	album = R3Album.load_from_id(album_id)
	album.load_r3_data()
	
for donation in db.c.fetch_all("SELECT * FROM rw_donations ORDER BY donation_id"):
	db.c.update("INSERT INTO r4_donations(user_id, donation_amount, donation_message, donation_private) VALUES (%s, %s, %s, %s)",
				(donation['user_id'], donation['donation_amount'], donation['donation_desc'], donation['donation_private_name']))

translated_stats = 0	
for stat in db.c.fetch_all("SELECT * FROM rw_listenerstats ORDER BY lstats_time"):
	db.c.update("INSERT INTO r4_listener_counts(lc_time, sid, lc_guests, lc_users, lc_users_active, lc_guests_active) VALUES (%s, %s, %s, %s, %s, %s)",
				(stat['lstats_time'], stat['sid'], stat['lstats_guests'], stat['lstats_regd'], stat['lstats_activeguests'], stat['lstats_activeregd']))
	translated_stats += 1
print "Translated stats   : %s" % translated_stats

discarded_requests = 0
translated_requests = 0
for request in db.c.fetch_all("SELECT rw_requests.*, r4_song_id FROM rw_requests JOIN rw_songs USING (song_id) ORDER BY request_id"):
	if request['r4_song_id']:
		db.c.update("INSERT INTO r4_request_history(user_id, song_id, request_fulfilled_at, request_line_size, request_at_rank, request_at_count) VALUES (%s, %s, %s, %s, %s, %s)",
			(request['user_id'], request['r4_song_id'], request['request_fulfilled_at'], request['rqlen_fulfilled_at'], request['user_request_rank'], request['user_request_snapshot']))
		translated_requests += 1
	else:
		discarded_requests += 1
print "Discarded requests : %s" % discarded_requests
print "Translated requests: %s" % translated_requests

translated_votes = 0
discarded_votes = 0
for vote in db.c.fetch_all("SELECT rw_votehistory.*, r4_song_id FROM rw_votehistory JOIN rw_songs USING (song_id) ORDER BY vhist_time"):
	if vote['r4_song_id']:
		db.c.update("INSERT INTO r4_votehistory(vote_time, user_id, song_id, vote_at_rank, vote_at_count) VALUES (%s, %s, %s, %s, %s)",
					(vote['vhist_time'], vote['user_id'], vote['r4_song_id'], vote['user_rank'], vote['user_vote_snapshot']))
		translated_votes += 1
	else:
		discarded_votes += 1
print "Discarded votes    : %s" % discarded_votes
print "Translated votes   : %s" % translated_votes
