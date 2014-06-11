import time

from libs import config
from libs import log
from libs import db

config = { }

def prepare_cooldown_algorithm(sid):
	"""
	Prepares pre-calculated variables that relate to calculating cooldown.
	Should pull all variables fresh from the DB, for algorithm
	refer to jfinalfunk.
	"""
	global config

	if not sid in config:
		config[sid] = { "time": 0 }
	if config[sid]['time'] > (time.time() - 3600):
		return

	# Variable names from here on down are from jf's proposal at: http://rainwave.cc/forums/viewtopic.php?f=13&t=1267
	sum_aasl = db.c.fetch_var("SELECT SUM(aasl) FROM (SELECT AVG(song_length) AS aasl FROM r4_album_sid JOIN r4_song_sid USING (album_id) JOIN r4_songs USING (song_id) WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS jfiscrazy", (sid,))
	if not sum_aasl:
		sum_aasl = 100000
	log.debug("cooldown", "SID %s: sumAASL: %s" % (sid, sum_aasl))
	avg_album_rating = db.c.fetch_var("SELECT AVG(album_rating) FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE", (sid,))
	if not avg_album_rating:
		avg_album_rating = 3.5
	log.debug("cooldown", "SID %s: avg_album_rating: %s" % (sid, avg_album_rating))
	multiplier_adjustment = db.c.fetch_var("SELECT SUM(tempvar) FROM (SELECT r4_album_sid.album_id, AVG(album_cool_multiply) * AVG(song_length) AS tempvar FROM r4_album_sid JOIN r4_song_sid USING (album_id) JOIN r4_songs USING (song_id) WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS hooooboy", (sid,))
	multiplier_adjustment = multiplier_adjustment / float(sum_aasl)
	if not multiplier_adjustment:
		multiplier_adjustment = 1
	log.debug("cooldown", "SID %s: multi: %s" % (sid, multiplier_adjustment))
	base_album_cool = float(config.get_station(sid, "cooldown_percentage")) * float(sum_aasl) / float(multiplier_adjustment)
	log.debug("cooldown", "SID %s: base_album_cool: %s" % (sid, base_album_cool))
	base_rating = db.c.fetch_var("SELECT SUM(tempvar) FROM (SELECT r4_album_sid.album_id, AVG(album_rating) * AVG(song_length) AS tempvar FROM r4_albums JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s) JOIN r4_song_sid ON (r4_albums.album_id = r4_song_sid.album_id) JOIN r4_songs USING (song_id) WHERE r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS hooooboy", (sid,))
	base_rating = float(base_rating) / float(sum_aasl)
	if not base_rating:
		base_rating = 4
	log.debug("cooldown", "SID %s: base rating: %s" % (sid, base_rating))
	min_album_cool = config.get_station(sid, "cooldown_highest_rating_multiplier") * base_album_cool
	log.debug("cooldown", "SID %s: min_album_cool: %s" % (sid, min_album_cool))
	max_album_cool = min_album_cool + ((5 - 2.5) * ((base_album_cool - min_album_cool) / (5 - base_rating)))
	log.debug("cooldown", "SID %s: max_album_cool: %s" % (sid, max_album_cool))

	config[sid]['sum_aasl'] = int(sum_aasl)
	config[sid]['avg_album_rating'] = float(avg_album_rating)
	config[sid]['multiplier_adjustment'] = float(multiplier_adjustment)
	config[sid]['base_album_cool'] = int(base_album_cool)
	config[sid]['base_rating'] = float(base_rating)
	config[sid]['min_album_cool'] = int(min_album_cool)
	config[sid]['max_album_cool'] = int(max_album_cool)
	config[sid]['time'] = int(time.time())

	average_song_length = db.c.fetch_var("SELECT AVG(song_length) FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_exists = TRUE AND sid = %s", (sid,))
	log.debug("cooldown", "SID %s: average_song_length: %s" % (sid, average_song_length))
	config[sid]['average_song_length'] = float(average_song_length)
	if not average_song_length:
		average_song_length = 160
	number_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s", (sid,))
	if not number_songs:
		number_songs = 1
	log.debug("cooldown", "SID %s: number_songs: %s" % (sid, number_songs))
	config[sid]['max_song_cool'] = float(average_song_length) * (number_songs * config.get_station(sid, "cooldown_song_max_multiplier"))
	config[sid]['min_song_cool'] = config[sid]['max_song_cool'] * config.get_station(sid, "cooldown_song_min_multiplier")