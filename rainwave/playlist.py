import time
import random

from libs import db
from libs import log
from libs import config

from rainwave.playlist_objects.song import Song
from rainwave.playlist_objects import cooldown

# These sorts of single-function imports are to make sure
# that any non-refactored code works with the way this module used to be.
# (this module used to be gargantuan)
# pylint will flag these as unused but TRUST ME, KEEP THEM HERE
from rainwave.playlist_objects.album import Album
from rainwave.playlist_objects.album import warm_cooled_albums
from rainwave.playlist_objects.album import get_updated_albums_dict
from rainwave.playlist_objects.artist import Artist
from rainwave.playlist_objects.songgroup import SongGroup
from rainwave.playlist_objects.cooldown import prepare_cooldown_algorithm

num_songs = {}

class NoAvailableSongsException(Exception):
	pass

def update_num_songs():
	for sid in config.station_ids:
		num_songs[sid] = db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s", (sid,))

def get_average_song_length(sid):
	return cooldown.cooldown_config[sid]['average_song_length']

def get_random_song_timed(sid, target_seconds = None, target_delta = None):
	"""
	Fetch a random song abiding by all election block, request block, and
	availability rules, but giving priority to the target song length
	provided.  Falls back to get_random_song on failure.
	"""
	if not target_seconds:
		return get_random_song(sid)
	if not target_delta:
		target_delta = config.get_station(sid, "song_lookup_length_delta")

	sql_query = ("FROM r4_song_sid "
					"JOIN r4_songs USING (song_id) "
					"JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_exists = TRUE "
					"AND song_cool = FALSE "
					"AND song_elec_blocked = FALSE "
					"AND album_requests_pending IS NULL "
					"AND song_request_only = FALSE "
					"AND song_length >= %s AND song_length <= %s")
	lower_target_bound = target_seconds - (target_delta / 2)
	upper_target_bound = target_seconds + (target_delta / 2)
	num_available = db.c.fetch_var("SELECT COUNT(r4_song_sid.song_id) " + sql_query, (sid, lower_target_bound, upper_target_bound))
	log.info("song_select", "Song pool size (cooldown, blocks, requests, timed) [target %s delta %s]: %s" % (target_seconds, target_delta, num_available))
	if num_available == 0:
		log.warn("song_select", "No songs available with target_seconds %s and target_delta %s." % (target_seconds, target_delta))
		log.debug("song_select", "Song select query: SELECT COUNT(r4_song_sid.song_id) " + sql_query % (sid, lower_target_bound, upper_target_bound))
		return get_random_song(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT r4_song_sid.song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, lower_target_bound, upper_target_bound, offset))
		return Song.load_from_id(song_id, sid)

def get_random_song(sid):
	"""
	Fetch a random song, abiding by all election block, request block, and
	availability rules.  Falls back to get_random_ignore_requests on failure.
	"""

	sql_query = ("FROM r4_song_sid "
					"JOIN r4_songs USING (song_id) "
					"JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_exists = TRUE "
					"AND song_cool = FALSE "
					"AND song_request_only = FALSE "
					"AND song_elec_blocked = FALSE "
					"AND album_requests_pending IS NULL")
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	log.info("song_select", "Song pool size (cooldown, blocks, requests): %s" % num_available)
	offset = 0
	if num_available == 0:
		log.warn("song_select", "No songs available despite no timing rules.")
		log.debug("song_select", "Song select query: SELECT COUNT(song_id) " + (sql_query %  (sid,)))
		return get_random_song_ignore_requests(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset))
		return Song.load_from_id(song_id, sid)

def get_shortest_song(sid):
	"""
	Fetch the shortest song available abiding by election block and availability rules.
	"""
	sql_query = ("FROM r4_song_sid "
					"JOIN r4_songs USING (song_id) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_exists = TRUE "
					"AND song_cool = FALSE "
					"AND song_request_only = FALSE "
					"AND song_elec_blocked = FALSE "
				"ORDER BY song_length")
	song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1", (sid,))
	return Song.load_from_id(song_id, sid)

def get_random_song_ignore_requests(sid):
	"""
	Fetch a random song abiding by election block and availability rules,
	but ignoring request blocking rules.
	"""
	sql_query = ("FROM r4_song_sid "
			"WHERE r4_song_sid.sid = %s "
				"AND song_exists = TRUE "
				"AND song_cool = FALSE "
				"AND song_request_only = FALSE "
				"AND song_elec_blocked = FALSE ")
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	log.debug("song_select", "Song pool size (cooldown, blocks): %s" % num_available)
	offset = 0
	if num_available == 0:
		log.warn("song_select", "No songs available while ignoring pending requests.")
		log.debug("song_select", "Song select query: SELECT COUNT(song_id) " + (sql_query %  (sid,)))
		return get_random_song_ignore_all(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset))
		return Song.load_from_id(song_id, sid)

def get_random_song_ignore_all(sid):
	"""
	Fetches the most stale song (longest time since it's been played) in the db,
	ignoring all availability and election block rules.
	"""
	sql_query = "FROM r4_song_sid WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	offset = 0
	if num_available == 0:
		log.critical("song_select", "No songs exist.")
		log.debug("song_select", "Song select query: SELECT COUNT(song_id) " + (sql_query %  (sid,)))
		raise Exception("Could not find any songs to play.")
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset))
		return Song.load_from_id(song_id, sid)

def warm_cooled_songs(sid):
	"""
	Makes songs whose cooldowns have expired available again.
	"""
	db.c.update("UPDATE r4_song_sid SET song_cool = FALSE WHERE sid = %s AND song_cool_end < %s AND song_cool = TRUE", (sid, int(time.time())))
	db.c.update("UPDATE r4_song_sid SET song_request_only = FALSE WHERE sid = %s AND song_request_only_end IS NOT NULL AND song_request_only_end < %s AND song_request_only = TRUE", (sid, int(time.time())))

def remove_all_locks(sid):
	"""
	Removes all cooldown & election locks on songs.
	"""
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked = FALSE, song_elec_blocked_num = 0, song_cool = FALSE, song_cool_end = 0 WHERE sid = %s", (sid,))
	db.c.update("UPDATE r4_album_sid SET album_cool = FALSE AND album_cool_lowest = 0 WHERE sid = %s" % sid)

def get_all_albums_list(sid, user = None):
	if not user or user.id == 1:
		return db.c.fetch_all(
			"SELECT r4_albums.album_id AS id, album_name AS name, album_name_searchable AS name_searchable, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, FALSE AS fave, 0 AS rating_user, FALSE AS rating_complete "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE "
			"ORDER BY album_name",
			(sid,))
	else:
		return db.c.fetch_all(
			"SELECT r4_albums.album_id AS id, album_name AS name, album_name_searchable AS name_searchable, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, COALESCE(album_fave, FALSE) AS fave, COALESCE(album_rating_user, 0) AS rating_user, COALESCE(album_rating_complete, FALSE) AS rating_complete "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s AND r4_album_ratings.sid = %s) "
			"WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE "
			"ORDER BY album_name",
			(user.id, sid, sid))

def get_all_artists_list(sid):
	return db.c.fetch_all(
		"SELECT artist_name AS name, artist_name_searchable AS name_searchable, artist_id AS id, COUNT(*) AS song_count "
		"FROM r4_artists JOIN r4_song_artist USING (artist_id) JOIN r4_song_sid using (song_id) "
		"WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
		"GROUP BY artist_id, artist_name "
		"ORDER BY artist_name",
		(sid,))

def get_all_groups_list(sid):
	return db.c.fetch_all(
		"SELECT group_name AS name, group_name_searchable AS name_searchable, group_id AS id, COUNT(*) AS song_count "
			"FROM ("
				"SELECT group_name, group_name_searchable, group_id, COUNT(DISTINCT(album_id)) "
					"FROM r4_groups "
						"JOIN r4_song_group USING (group_id) "
						"JOIN r4_song_sid ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) "
						"JOIN r4_songs ON (r4_song_group.song_id = r4_songs.song_id) "
						"JOIN r4_albums USING (album_id) "
					"GROUP BY group_id, group_name_searchable, group_name "
					"HAVING COUNT(DISTINCT(album_id)) > 1 "
				") AS multi_album_groups "
			"JOIN r4_song_group USING (group_id) "
			"JOIN r4_song_sid using (song_id) "
		"WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
		"GROUP BY group_id, group_name, group_name_searchable "
		"ORDER BY group_name",
		(sid, sid,))

def reduce_song_blocks(sid):
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked_num = song_elec_blocked_num - 1 WHERE song_elec_blocked = TRUE AND sid = %s", (sid,))
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked_num = 0, song_elec_blocked = FALSE WHERE song_elec_blocked_num <= 0 AND song_elec_blocked = TRUE AND sid = %s", (sid,))

def get_unrated_songs_for_user(user_id, limit = "LIMIT ALL"):
	return db.c.fetch_all(
		"SELECT r4_songs.song_id AS id, song_title AS title, album_name "
		"FROM r4_songs JOIN r4_albums USING (album_id) "
		"LEFT OUTER JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
		"WHERE song_verified = TRUE AND r4_song_ratings.song_id IS NULL ORDER BY album_name, song_title " + limit, (user_id,))

def _get_requested_albums_sql():
	return ("WITH requested_albums AS ("
		"SELECT r4_songs.album_id "
		"FROM r4_request_store "
			"JOIN r4_song_sid ON "
				"(r4_request_store.song_id = r4_song_sid.song_id "
				"AND r4_request_store.sid = r4_song_sid.sid) "
			"JOIN r4_songs ON (r4_songs.song_id = r4_request_store.song_id) "
			"WHERE user_id = %s) ")

def get_unrated_songs_for_requesting(user_id, sid, limit):
	# This insane bit of SQL fetches the user's largest unrated albums that aren't on cooldown
	unrated = []
	for row in db.c.fetch_all(
			_get_requested_albums_sql() +
			("SELECT MIN(r4_song_sid.song_id) AS song_id, COUNT(r4_song_sid.song_id) AS unrated_count, r4_songs.album_id "
				"FROM r4_song_sid JOIN r4_songs USING (song_id) "
					"LEFT OUTER JOIN r4_song_ratings ON "
						"(r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
					"LEFT JOIN requested_albums ON "
						"(requested_albums.album_id = r4_songs.album_id) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_exists = TRUE "
					"AND song_cool = FALSE "
					"AND r4_song_ratings.song_id IS NULL "
					"AND requested_albums.album_id IS NULL "
			"GROUP BY r4_songs.album_id "
			"ORDER BY unrated_count DESC "
			"LIMIT %s"), (user_id, user_id, sid, limit)):
		unrated.append(row['song_id'])

	# Similar to the above, but this time we take whatever's on shortest cooldown (ignoring album unrated count)
	if len(unrated) < limit:
		for album_row in db.c.fetch_all(
				_get_requested_albums_sql() + 
				("SELECT r4_songs.album_id, MIN(song_cool_end) "
					"FROM r4_song_sid "
						"JOIN r4_songs USING (song_id) "
						"JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
						"LEFT OUTER JOIN r4_song_ratings ON "
							"(r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
						"LEFT JOIN requested_albums ON "
							"(requested_albums.album_id = r4_songs.album_id) "
					"WHERE r4_song_sid.sid = %s "
						"AND song_exists = TRUE "
						"AND song_cool = TRUE "
						"AND r4_song_ratings.song_id IS NULL "
						"AND requested_albums.album_id IS NULL "
				"GROUP BY r4_songs.album_id "
				"ORDER BY MIN(song_cool_end) "
				"LIMIT %s"), (user_id, user_id, sid, (limit - len(unrated)))):
			song_id = db.c.fetch_var(
				"SELECT r4_song_sid.song_id "
					"FROM r4_songs JOIN r4_song_sid USING (song_id) LEFT OUTER JOIN r4_song_ratings ON "
						"(r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
					"WHERE r4_songs.album_id = %s "
						"AND r4_song_sid.sid = %s "
						"AND song_exists = TRUE "
						"AND song_cool = TRUE "
						"AND r4_song_ratings.song_id IS NULL "
					"ORDER BY song_cool_end "
					"LIMIT 1", (user_id, album_row['album_id'], sid))
			unrated.append(song_id)
	return unrated

def get_favorited_songs_for_requesting(user_id, sid, limit):
	# This SQL fetches ALL the favourites, 1 per album, and shuffles them. Then sends back the first X results, where X is the limit.
	favorited = []
	for row in db.c.fetch_all(
			_get_requested_albums_sql() +
			("SELECT MIN(r4_song_sid.song_id) AS song_id, COUNT(r4_song_sid.song_id) AS unrated_count, r4_songs.album_id "
				"FROM r4_song_sid JOIN r4_songs USING (song_id) "
					"LEFT OUTER JOIN r4_song_ratings ON "
						"(r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
					"LEFT JOIN requested_albums ON "
						"(requested_albums.album_id = r4_songs.album_id) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_exists = TRUE "
					"AND song_cool = FALSE "
					"AND r4_song_ratings.song_fave = TRUE "
					"AND requested_albums.album_id IS NULL "
				"GROUP BY r4_songs.album_id "), (user_id, user_id, sid)):
		favorited.append(row['song_id'])

	#Shuffles the favourites and sends back based on the limit
	random.shuffle(favorited)
	if len(favorited) > limit:
		return favorited[0:limit]
	return favorited
