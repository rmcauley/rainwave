import time

from libs import db
from libs import log
from libs import cache

def get_song_rating(song_id, user_id):
	rating = cache.get_song_rating(song_id, user_id)
	if not rating:
		rating = db.c.fetch_row("SELECT song_rating_user AS rating_user, song_fave AS fave FROM r4_song_ratings WHERE user_id = %s AND song_id = %s", (user_id, song_id))
		if not rating:
			rating = { "rating_user": 0, "fave": None }
	cache.set_song_rating(song_id, user_id, rating)
	return rating

def get_album_rating(sid, album_id, user_id):
	rating = cache.get_album_rating(sid, album_id, user_id)
	if not rating:
		rating = db.c.fetch_row("SELECT album_rating_user AS rating_user, album_fave AS fave FROM r4_album_ratings WHERE user_id = %s AND album_id = %s AND sid = %s", (user_id, album_id, sid))
		if not rating:
			rating = { "rating_user": 0, "fave": None }
	cache.set_album_rating(sid, album_id, user_id, rating)
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
		db.c.update("UPDATE phpbb_users SET radio_totalmindchange = radio_totalmindchange + 1 WHERE user_id = %s", (user_id,))
	else:
		if not rating:
			rating = None
		if not fave:
			fave = None
		db.c.update("INSERT INTO r4_song_ratings "
					"(song_rating_user, song_fave, song_rated_at, song_rated_at_rank, song_rated_at_count, user_id, song_id) "
					"VALUES (%s, %s, %s, %s, %s, %s, %s)",
					(rating, fave, time.time(), rank, count, user_id, song_id))

	db.c.update("UPDATE phpbb_users SET radio_totalratings = %s WHERE user_id = %s", (count, user_id))
	cache.set_song_rating(song_id, user_id, { "rating_user": rating, "fave": fave })

	return update_album_ratings(song_id, user_id)

def clear_song_rating(song_id, user_id):
	existed = db.c.update("DELETE FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	if existed:
		return update_album_ratings(song_id, user_id)
	else:
		return []

def set_song_fave(song_id, user_id, fave):
	exists = db.c.fetch_row("SELECT * FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	rating = None
	if not exists:
		if db.c.update("INSERT INTO r4_song_ratings (song_id, user_id, song_fave) VALUES (%s, %s, %s)", (song_id, user_id, fave)) == 0:
			log.debug("rating", "Failed to insert record for song fave %s, fave is: %s." % (song_id, fave))
			return False
	else:
		rating = exists["song_rating_user"]
		if db.c.update("UPDATE r4_song_ratings SET song_fave = %s WHERE song_id = %s AND user_id = %s", (fave, song_id, user_id)) == 0:
			log.debug("rating", "Failed to update record for fave song %s, fave is: %s." % (song_id, fave))
			return False
	if (not exists and fave) or (not exists["song_fave"] and fave):
		db.c.update("UPDATE r4_songs SET song_fave_count = song_fave_count + 1 WHERE song_id = %s", (song_id,))
	elif (exists and exists["song_fave"] and not fave):
		db.c.update("UPDATE r4_songs SET song_fave_count = song_fave_count - 1 WHERE song_id = %s", (song_id,))
	cache.set_song_rating(song_id, user_id, { "rating_user": rating, "fave": fave })
	return True

def set_album_fave(album_id, user_id, fave, sid):
	category = "album"
	exists = db.c.fetch_row("SELECT * FROM r4_" + category + "_ratings WHERE " + category + "_id = %s AND user_id = %s AND sid = %s", (album_id, user_id, sid))
	rating = None
	rating_complete = None
	if not exists:
		if db.c.update("INSERT INTO r4_" + category + "_ratings (" + category + "_id, user_id, " + category + "_fave, sid) VALUES (%s, %s, %s, %s)", (album_id, user_id, fave, sid)) == 0:
			log.debug("rating", "Failed to insert record for fave %s %s, fave is: %s." % (category, album_id, fave))
			return False
	else:
		rating = exists[category + "_rating_user"]
		rating_complete = exists['album_rating_complete']
		if db.c.update("UPDATE r4_" + category + "_ratings SET " + category + "_fave = %s WHERE " + category + "_id = %s AND user_id = %s AND sid = %s", (fave, album_id, user_id, sid)) == 0:
			log.debug("rating", "Failed to update record for fave %s %s, fave is: %s." % (category, album_id, fave))
			return False
	if (not exists and fave) or (not exists[category + "_fave"] and fave):
		db.c.update("UPDATE r4_" + category + "_sid SET " + category + "_fave_count = " + category + "_fave_count + 1 WHERE " + category + "_id = %s AND sid = %s", (album_id, sid))
	elif (exists and exists[category + "_fave"] and not fave):
		db.c.update("UPDATE r4_" + category + "_sid SET " + category + "_fave_count = " + category + "_fave_count - 1 WHERE " + category + "_id = %s AND sid = %s", (album_id, sid))
	if category == "album":
		cache.set_album_rating(sid, album_id, user_id, { "rating_user": rating, "fave": fave, "rating_complete": rating_complete })
	elif category == "song":
		cache.set_song_rating(sid, album_id, user_id, { "rating_user": rating, "fave": fave })
	return True

def _set_fave(category, object_id, user_id, fave, sid = None):
	if category != "album" and category != "song":
		raise Exception("Invalid favourite category.")

	exists = db.c.fetch_row("SELECT * FROM r4_" + category + "_ratings WHERE " + category + "_id = %s AND user_id = %s", (object_id, user_id))
	rating = None
	rating_complete = None
	if not exists:
		if db.c.update("INSERT INTO r4_" + category + "_ratings (" + category + "_id, user_id, " + category + "_fave) VALUES (%s, %s, %s)", (object_id, user_id, fave)) == 0:
			log.debug("rating", "Failed to insert record for fave %s %s, fave is: %s." % (category, object_id, fave))
			return False
	else:
		rating = exists[category + "_rating_user"]
		if "album_rating_complete" in exists:
			rating_complete = exists['album_rating_complete']
		if db.c.update("UPDATE r4_" + category + "_ratings SET " + category + "_fave = %s WHERE " + category + "_id = %s AND user_id = %s", (fave, object_id, user_id)) == 0:
			log.debug("rating", "Failed to update record for fave %s %s, fave is: %s." % (category, object_id, fave))
			return False
	if (not exists and fave) or (not exists[category + "_fave"] and fave):
		db.c.update("UPDATE r4_" + category + "s SET " + category + "_fave_count = " + category + "_fave_count + 1 WHERE " + category + "_id = %s", (object_id,))
	elif (exists and exists[category + "_fave"] and not fave):
		db.c.update("UPDATE r4_" + category + "s SET " + category + "_fave_count = " + category + "_fave_count - 1 WHERE " + category + "_id = %s", (object_id,))
	if category == "album":
		cache.set_album_rating(object_id, user_id, { "rating_user": rating, "fave": fave, "rating_complete": rating_complete })
	elif category == "song":
		cache.set_song_rating(object_id, user_id, { "rating_user": rating, "fave": fave })
	return True

def update_album_ratings(song_id, user_id, sid):
	album_id = db.c.fetch_var("SELECT album_id FROM r4_songs WHERE song_id = %s", (song_id,))
	user_data = db.c.fetch_row(
		"SELECT ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS rating_user, "
			"COUNT(song_rating_user) AS rating_user_count "
		"FROM JOIN r4_songs USING (song_id) WHERE album_id = %s AND sid = %s AND song_exists = TRUE "
			"JOIN r4_song_ratings USING (song_id) "
		"WHERE user_id = %s",
		(album_id, user_id))
	num_songs = db.c.fetch_var("SELECT album_song_count FROM r4_album_sid WHERE album_id = %s", (album_id,))
	rating_complete = False
	if user_data['rating_user_count'] >= num_songs:
		rating_complete = True
	album_rating = float(user_data['rating_user'])
	album_fave = None
	existing_rating = db.c.fetch_row("SELECT album_rating_user, album_fave FROM r4_album_ratings WHERE album_id = %s AND user_id = %s", (album_id, user_id))
	if existing_rating:
		album_fave = existing_rating['album_fave']
		db.c.update("UPDATE r4_album_ratings SET album_rating_user = %s, album_fave = %s, album_rating_complete = %s WHERE user_id = %s AND album_id = %s",
					(album_rating, album_fave, rating_complete, user_id, album_id))
	else:
		db.c.update("INSERT INTO r4_album_ratings (album_rating_user, album_fave, album_rating_complete, user_id, album_id) VALUES (%s, %s, %s, %s, %s)",
					(album_rating, album_fave, rating_complete, user_id, album_id))
	cache.set_album_rating(album_id, user_id, { "rating_user": album_rating, "fave": album_fave, "rating_complete": rating_complete })
	return { "sid": sid, "id": album_id, "rating_user": album_rating, "rating_complete": rating_complete }
