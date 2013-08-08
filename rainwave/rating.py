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
		rating = db.c.fetch_row("SELECT song_rating_user AS user_rating, song_fave AS fave FROM r4_song_ratings WHERE user_id = %s AND song_id = %s", (user_id, song_id))
		if not rating:
			rating = { "user_rating": 0, "fave": False }
	cache.set_song_rating(song_id, user_id, rating)
	return rating

def get_album_rating(album_id, user_id):
	rating = cache.get_album_rating(album_id, user_id)
	if not rating:
		rating = db.c.fetch_row("SELECT album_rating_user AS user_rating, album_fave AS fave FROM r4_album_ratings WHERE user_id = %s AND album_id = %s", (user_id, album_id))
		if not rating:
			rating = { "user_rating": 0, "fave": False }
	cache.set_album_rating(album_id, user_id, rating)
	return rating

def set_song_rating(song_id, user_id, rating = None, fave = None):
	existing_rating = db.c.fetch_row("SELECT song_rating_user, song_fave FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	count = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings WHERE user_id = %s", (user_id,))
	if not existing_rating:
		count += 1
	rank = db.c.fetch_var("SELECT COUNT(*) FROM phpbb_users WHERE radio_totalratings > %s", (count,))
	if existing_rating:
		if not rating:
			rating = existing_rating["song_rating_user"]
		if not fave:
			fave = existing_rating["song_fave"]
		db.c.update("UPDATE r4_song_ratings "
			"SET song_rating_user = %s, song_fave = %s, song_rated_at = %s, song_rated_at_rank = %s, song_rated_at_count = %s "
			"WHERE user_id = %s AND song_id = %s",
			(rating, fave, time.time(), rank, count, user_id, song_id))
	else:
		if not rating:
			rating = None
		if not fave:
			fave = False
		db.c.update("INSERT INTO r4_song_ratings "
					"(song_rating_user, song_fave, song_rated_at, song_rated_at_rank, song_rated_at_count, user_id, song_id) "
					"VALUES (%s, %s, %s, %s, %s, %s, %s)",
					(rating, fave, time.time(), rank, count, user_id, song_id))
	
	db.c.update("UPDATE phpbb_users SET radio_totalratings = %s WHERE user_id = %s", (count, user_id))
	cache.set_song_rating(song_id, user_id, { "user_rating": rating, "fave": fave })
	
	return update_album_ratings(song_id, user_id)

def clear_song_rating(song_id, user_id):
	existed = db.c.update("DELETE FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	if existed:
		return update_album_ratings(song_id, user_id)
	else:
		# TODO: Return an exception?
		return []
	
def set_song_fave(song_id, user_id, fave):
	to_return = _set_fave("song", song_id, user_id, fave)
	
def set_album_fave(album_id, user_id, fave):
	to_return = _set_fave("album", album_id, user_id, fave)

def _set_fave(category, object_id, user_id, fave):
	if category != "album" and category != "song":
		raise Exception("Invalid favourite category.")
	
	exists = db.c.fetch_row("SELECT * FROM r4_" + category + "_ratings WHERE " + category + "_id = %s AND user_id = %s", (object_id, user_id))
	rating = None
	album_complete = None
	if not exists:
		if not db.c.update("UPDATE r4_" + category + "_ratings SET " + category + "_fave = %s WHERE " + category + "_id = %s AND user_id = %s", (fave, object_id, user_id)):
			return False
	else:
		rating = exists[category + "_rating_user"]
		if "album_rating_complete" in exists:
			album_complete = exists['album_rating_complete']
		if not db.c.update("INSERT INTO r4_" + category + "_ratings (" + category + "_id, user_id, " + category + "_fave) VALUES (%s, %s, %s)", (object_id, user_id, fave)):
			return False
	if category == "album":
		cache.set_album_rating(object_id, user_id, { "user_rating": rating, "fave": fave, "rating_complete": rating_complete })
	elif category == "song":
		cache.set_song_rating(object_id, user_id, { "user_rating": rating, "fave": fave })
	return True
	
def update_album_ratings(song_id, user_id):
	toreturn = []
	for album_id in db.c.fetch_list("SELECT DISTINCT album_id FROM r4_song_sid WHERE song_id = %s", (song_id,)):
		# TODO: Can this query be sped up in *any* way possible?
		user_data = db.c.fetch_row(
			"SELECT ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS user_rating, "
				"COUNT(song_rating_user) AS user_rating_count "
			"FROM (SELECT DISTINCT song_id FROM r4_song_sid WHERE album_id = %s) AS temp "
				"JOIN r4_song_ratings USING (song_id) "
			"WHERE user_id = %s",
			(album_id, user_id))
		# TODO PRIORITY: This query is going to be slow, we should cache this value, probably right in the database in the r4_albums table.
		num_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM (SELECT DISTINCT song_id FROM r4_song_sid WHERE album_id = %s) AS temp", (album_id,))
		rating_complete = False
		if user_data['user_rating_count'] >= num_songs:
			rating_complete = True
		album_rating = float(user_data['user_rating'])
		toreturn.append({ "id": album_id, "user_rating": album_rating, "rating_complete": rating_complete })
		album_fave = False
		existing_rating = db.c.fetch_row("SELECT album_rating_user, album_fave FROM r4_album_ratings WHERE album_id = %s AND user_id = %s", (album_id, user_id))
		if existing_rating:
			album_fave = existing_rating['album_fave']
			db.c.update("UPDATE r4_album_ratings SET album_rating_user = %s, album_fave = %s, album_rating_complete = %s WHERE user_id = %s AND album_id = %s",
						(album_rating, album_fave, rating_complete, user_id, album_id))
		else:
			db.c.update("INSERT INTO r4_album_ratings (album_rating_user, album_fave, album_rating_complete, user_id, album_id) VALUES (%s, %s, %s, %s, %s)",
						(album_rating, album_fave, rating_complete, user_id, album_id))
		cache.set_album_rating(album_id, user_id, { "user_rating": album_rating, "fave": album_fave, "rating_complete": rating_complete })
	return toreturn
