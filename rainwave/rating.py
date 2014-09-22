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

def set_song_rating(sid, song_id, user_id, rating = None, fave = None):
	db.c.start_transaction()
	try:
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
			db.c.update("UPDATE phpbb_users SET radio_totalmindchange = radio_totalmindchange + 1, radio_inactive = FALSE, radio_last_active = %s WHERE user_id = %s", (time.time(), user_id,))
		else:
			if not rating:
				rating = None
			if not fave:
				fave = None
			db.c.update("INSERT INTO r4_song_ratings "
						"(song_rating_user, song_fave, song_rated_at, song_rated_at_rank, song_rated_at_count, user_id, song_id) "
						"VALUES (%s, %s, %s, %s, %s, %s, %s)",
						(rating, fave, time.time(), rank, count, user_id, song_id))

		db.c.update("UPDATE phpbb_users SET radio_totalratings = %s, radio_inactive = FALSE, radio_last_active = %s WHERE user_id = %s", (count, time.time(), user_id))

		albums = update_album_ratings(sid, song_id, user_id)
		db.c.commit()
		cache.set_song_rating(song_id, user_id, { "rating_user": rating, "fave": fave })
		return albums
	except:
		db.c.rollback()
		raise

def clear_song_rating(sid, song_id, user_id):
	existed = db.c.update("DELETE FROM r4_song_ratings WHERE song_id = %s AND user_id = %s", (song_id, user_id))
	if existed:
		db.c.start_transaction()
		try:
			albums = update_album_ratings(sid, song_id, user_id)
			db.c.commit()
			return albums
		except:
			db.c.rollback()
			raise
	else:
		return []

def set_song_fave(song_id, user_id, fave):
	db.c.start_transaction()
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
	db.c.commit()

def set_album_fave(sid, album_id, user_id, fave):
	db.c.start_transaction()
	exists = db.c.fetch_row("SELECT * FROM r4_album_ratings WHERE album_id = %s AND user_id = %s AND sid = %s", (album_id, user_id, sid))
	rating = None
	rating_complete = None
	if not exists:
		if db.c.update("INSERT INTO r4_album_ratings (album_id, user_id, album_fave, sid) VALUES (%s, %s, %s, %s)", (album_id, user_id, fave, sid)) == 0:
			log.debug("rating", "Failed to insert record for fave %s %s, fave is: %s." % ("album", album_id, fave))
			return False
	else:
		rating = exists["album" + "_rating_user"]
		rating_complete = exists['album_rating_complete']
		if db.c.update("UPDATE r4_album_ratings SET album_fave = %s WHERE album_id = %s AND user_id = %s AND sid = %s", (fave, album_id, user_id, sid)) == 0:
			log.debug("rating", "Failed to update record for fave %s %s, fave is: %s." % ("album", album_id, fave))
			return False
	if (not exists and fave) or (not exists["album" + "_fave"] and fave):
		db.c.update("UPDATE r4_album_sid SET album_fave_count = album_fave_count + 1 WHERE album_id = %s AND sid = %s", (album_id, sid))
	elif (exists and exists["album" + "_fave"] and not fave):
		db.c.update("UPDATE r4_album_sid SET album_fave_count = album_fave_count - 1 WHERE album_id = %s AND sid = %s", (album_id, sid))
	if "album" == "album":
		cache.set_album_rating(sid, album_id, user_id, { "rating_user": rating, "fave": fave, "rating_complete": rating_complete })
	elif "album" == "song":
		cache.set_song_rating(album_id, user_id, { "rating_user": rating, "fave": fave })
	return True
	db.c.commit()

def update_album_ratings(target_sid, song_id, user_id):
	toret = None
	for row in db.c.fetch_all("SELECT r4_songs.album_id, sid, album_song_count FROM r4_songs JOIN r4_album_sid USING (album_id) WHERE r4_songs.song_id = %s AND album_exists = TRUE", (song_id,)):
		album_id = row['album_id']
		sid = row['sid']
		num_songs = row['album_song_count']
		user_data = db.c.fetch_row(
			"SELECT ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS rating_user, "
				"COUNT(song_rating_user) AS rating_user_count "
			"FROM r4_songs "
				"JOIN r4_song_sid USING (song_id) "
				"JOIN r4_song_ratings USING (song_id) "
			"WHERE album_id = %s AND sid = %s AND song_exists = TRUE AND user_id = %s",
			(album_id, sid, user_id))
		rating_complete = False
		if user_data['rating_user_count'] >= num_songs:
			rating_complete = True
		album_rating = None
		if user_data['rating_user']:
			album_rating = float(user_data['rating_user'])
		album_fave = None
		existing_rating = db.c.fetch_row("SELECT album_rating_user, album_fave FROM r4_album_ratings WHERE album_id = %s AND user_id = %s AND sid = %s", (album_id, user_id, sid))
		if existing_rating:
			album_fave = existing_rating['album_fave']
			db.c.update("UPDATE r4_album_ratings SET album_rating_user = %s, album_fave = %s, album_rating_complete = %s WHERE user_id = %s AND album_id = %s AND sid = %s",
						(album_rating, album_fave, rating_complete, user_id, album_id, sid))
		else:
			db.c.update("INSERT INTO r4_album_ratings (album_rating_user, album_fave, album_rating_complete, user_id, album_id, sid) VALUES (%s, %s, %s, %s, %s, %s)",
						(album_rating, album_fave, rating_complete, user_id, album_id, sid))
		cache.set_album_rating(sid, album_id, user_id, { "rating_user": album_rating, "fave": album_fave, "rating_complete": rating_complete })
		if target_sid == sid:
			toret = { "sid": sid, "id": album_id, "rating_user": album_rating, "rating_complete": rating_complete }
	return toret
