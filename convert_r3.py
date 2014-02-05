#!/usr/bin/python

import os
import sys
import os

from libs import config
from libs import db
import rainwave.playlist

# Step 1: db_init.py
# Step 2: rw_scanner.py --full
# Step 3: this script
# Step 4: CREATE INDEX ON rw_songratings (song_rating_id); if you haven't already

config.load()
db.open()

class R3Song(rainwave.playlist.Song):
	def load_r3_data(self):
		r3_data = db.c.fetch_row("SELECT MIN(song_addedon) AS song_added_on, SUM(song_totalrequests) AS song_request_count, MAX(song_oa_multiplier) AS song_cool_multiply, MAX(song_oa_override) AS song_cool_override, MAX(song_rating_id) AS song_rating_id FROM rw_songs WHERE song_filename = %s GROUP BY song_filename", (self.filename,))
		if not r3_data:
			return 0
		db.c.update("UPDATE rw_songs SET r4_song_id = %s WHERE song_filename = %s", (self.id, self.filename))
		db.c.update("UPDATE r4_songs SET song_request_count = %s, song_added_on = %s, song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s", (r3_data['song_request_count'], r3_data['song_added_on'], r3_data['song_cool_multiply'], r3_data['song_cool_override'], self.id))

		updated_ratings = db.c.update(
			"INSERT INTO r4_song_ratings(song_id, song_rating_user, user_id, song_rated_at, song_rated_at_rank, song_rated_at_count, song_fave) "
			"SELECT %s AS song_id, rw_songratings.song_rating AS song_rating_user, rw_songratings.user_id AS user_id, "
				"rw_songratings.song_rated_at AS song_rated_at, rw_songratings.user_rating_rank AS song_rated_at_rank, "
				"rw_songratings.user_rating_snapshot AS song_rated_at_count, "
				"CASE WHEN rw_songfavourites.user_id IS NOT NULL THEN TRUE ELSE NULL END AS song_fave "
			"FROM rw_songratings "
			"LEFT JOIN rw_songfavourites ON (rw_songratings.user_id = rw_songfavourites.user_id AND rw_songratings.song_rating_id = rw_songfavourites.song_rating_id) "
			"WHERE rw_songratings.song_rating_id = %s",
			(self.id, r3_data['song_rating_id']))

		self.update_rating(skip_album_update=True)

		return updated_ratings

class R3Album(rainwave.playlist.Album):
	def load_r3_data(self):
		db.c.update("INSERT INTO r4_album_ratings(user_id, album_id, album_fave) "
					"SELECT user_id, MIN(%s) AS album_id, BOOL_OR(TRUE) as album_fave "
					"FROM rw_albums JOIN rw_albumfavourites USING (album_id) "
					"WHERE album_name = %s GROUP BY user_id",
					(self.id, self.data['name']))

		self.update_all_user_ratings()
		self.update_rating()

os.nice(20)

translated_songs = 0
translated_albums = 0
translated_ratings = 0
for song_id in db.c.fetch_list("SELECT song_id FROM r4_songs"):
	song = R3Song.load_from_id(song_id)
	translated_ratings += song.load_r3_data()
	translated_songs += 1
	print "\rTranslating songs / ratings: %s / %s" % (translated_songs, translated_ratings),
	sys.stdout.flush()
print
print

for album_id in db.c.fetch_list("SELECT album_id FROM r4_albums"):
	album = R3Album.load_from_id(album_id)
	album.load_r3_data()
	translated_albums += 1
	print "\rTranslated albums : ", translated_albums,
	sys.stdout.flush()
print
print

translated_donations = 0
for donation in db.c.fetch_all("SELECT * FROM rw_donations ORDER BY donation_id"):
	db.c.update("INSERT INTO r4_donations(user_id, donation_amount, donation_message, donation_private) VALUES (%s, %s, %s, %s)",
				(donation['user_id'], donation['donation_amount'], donation['donation_desc'], donation['donation_private_name']))
	translated_donations += 1

print "Translated donat. : ", translated_donations
print

# translated_stats = 0
# for stat in db.c.fetch_all("SELECT * FROM rw_listenerstats ORDER BY lstats_time LIMIT 300"):
# 	db.c.update("INSERT INTO r4_listener_counts(lc_time, sid, lc_guests, lc_users, lc_users_active, lc_guests_active) VALUES (%s, %s, %s, %s, %s, %s)",
# 				(stat['lstats_time'], stat['sid'], stat['lstats_guests'], stat['lstats_regd'], stat['lstats_activeguests'], stat['lstats_activeregd']))
# 	translated_stats += 1
# 	print "\rTranslated stats   : %s" % translated_stats,

print "Processing requests in database...",
translated_requests = db.c.update("INSERT INTO r4_request_history(user_id, song_id, request_fulfilled_at, request_line_size, request_at_count) SELECT user_id, r4_song_id AS song_id, request_fulfilled_at, rqlen_fulfilled_at AS request_line_size, user_request_snapshot AS request_at_count FROM rw_requests JOIN rw_songs USING (song_id) WHERE r4_song_id IS NOT NULL ORDER BY request_id")
print "\rTranslated requests: %s" % translated_requests

print "Processing votes in database....",
translated_votes = "INSERT INTO r4_vote_history(vote_time, user_id, song_id, vote_at_rank, vote_at_count) SELECT vhist_time AS vote_time, user_id, r4_song_id AS song_id, user_rank AS vote_at_rank, user_vote_snapshot AS vote_at_count FROM rw_votehistory JOIN rw_songs USING (song_id) WHERE r4_song_id IS NOT NULL ORDER BY vhist_time"
print "\rTranslated votes: %s" % translated_requests
print

print "R4: Ready to Launch"