import os
import time
import random
import math

from libs import db
from libs import config
from libs import log
from libs import cache

def get_song_rating(song_id, user_id):
	rating = cache.get_song_rating(song_id, user_id)
	if not rating:
		rating = db.c.fetch_row("SELECT song_user_rating AS user_rating, song_fave AS fave FROM r4_song_ratings WHERE user_id = %s AND song_id = %s", (user_id, song_id))
		if not rating:
			rating = { "user_rating": 0, "fave": False }
	cache.set_song_rating(song_id, user_id, rating)
	return rating

def get_album_rating(album_id, user_id):
	rating = cache.get_album_rating(album_id, user_id)
	if not rating:
		rating = db.c.fetch_row("SELECT album_user_rating AS user_rating, album_fave AS fave FROM r4_album_ratings WHERE user_id = %s AND album_id = %s", (user_id, album_id))
		if not rating:
			rating = { "user_rating": 0, "fave": False }
	cache.set_album_rating(album_id, user_id, rating)
	return rating

def set_song_rating(song_id, user_id, rating = None, fave = None):
	existing_rating = db.c.fetch_row("SELECT song_user_rating, song_fave FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	count = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings WHERE user_id = %s", (user_id,))
	if not existing_rating:
		count += 1
	rank = db.c.fetch_var("SELECT COUNT(*) FROM phpbb_users WHERE radio_totalratings > %s", (count,))
	if existing_rating:
		if not rating:
			rating = existing_rating["song_user_rating"]
		if not fave:
			fave = existing_rating["song_fave"]
		db.c.update("UPDATE r4_song_ratings "
			"SET song_user_rating = %s, song_fave = %s, song_rated_at = %s, song_rated_at_rank = %s, song_rated_at_count = %s "
			"WHERE user_id = %s AND song_id = %s",
			(rating, fave, time.time(), rank, count, user_id, song_id))
	else:
		if not rating:
			rating = 0
		if not fave:
			fave = False
		db.c.update("INSERT INTO r4_song_ratings "
					"(song_user_rating, song_fave, song_rated_at, song_rated_at_rank, song_rated_at_count, user_id, song_id) "
					"VALUES (%s, %s, %s, %s, %s, %s, %s)",
					(rating, fave, time.time(), rank, count, user_id, song_id))
	
	db.c.update("UPDATE phpbb_users SET radio_totalratings = %s WHERE user_id = %s", (count, user_id))
	cache.set_song_rating(song_id, user_id, { "user_rating": rating, "fave": fave })
	
	toreturn = []
	for album_id in db.c.fetch_list("SELECT album_id FROM r4_song_album WHERE song_id = %s", (song_id,)):
		album_rating = float(db.c.fetch_var("SELECT ROUND(CAST(AVG(song_user_rating) AS NUMERIC), 1) AS user_rating FROM r4_song_album JOIN r4_song_ratings ON (album_id = %s AND r4_song_album.song_id = r4_song_ratings.song_id) "
									  "WHERE user_id = %s",
									  (album_id, user_id)))
		toreturn.append({ "id": album_id, "user_rating": album_rating})
		album_fave = False
		existing_rating = db.c.fetch_row("SELECT album_user_rating, album_fave FROM r4_album_ratings WHERE album_id = %s AND user_id = %s", (album_id, user_id))
		if existing_rating:
			album_fave = existing_rating['album_fave']
			db.c.update("UPDATE r4_album_ratings SET album_user_rating = %s, album_fave = %s WHERE user_id = %s AND album_id = %s",
						(album_rating, album_fave, user_id, album_id))
		else:
			db.c.update("INSERT INTO r4_album_ratings (album_user_rating, album_fave, user_id, album_id) VALUES (%s, %s, %s, %s)",
						(album_rating, album_fave, user_id, album_id))
		cache.set_album_rating(album_id, user_id, { "user_rating": album_rating, "fave": album_fave })
	return toreturn
