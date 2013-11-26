import os
import time
import random
import math
import subprocess

from mutagen.mp3 import MP3

from libs import db
from libs import config
from libs import log
from libs import cache
from rainwave import rating

cooldown_config = { }

class NoAvailableSongsException(Exception):
	pass

def get_shortest_song(sid):
	"""
	This function gets the shortest available song to us from the database.
	"""
	# Should we take into account song_elec_blocked here?
	return db.c.fetch_var("SELECT MIN(song_length) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE song_exists = TRUE AND r4_song_sid.sid = %s AND song_cool = FALSE", (sid,))

def get_average_song_length(sid = None):
	"""
	Calculates the average song length of available songs in the database.
	"""
	return db.c.fetch_var("SELECT AVG(song_length) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE song_exists = TRUE AND r4_song_sid.sid = %s AND song_cool = FALSE", (sid,))

def prepare_cooldown_algorithm(sid):
	"""
	Prepares pre-calculated variables that relate to calculating cooldown.
	Should pull all variables fresh from the DB, for algorithm
	refer to jfinalfunk.
	"""
	global cooldown_config

	if not sid in cooldown_config:
		cooldown_config[sid] = { "time": 0 }
	if cooldown_config[sid]['time'] > (time.time() - 3600):
		return

	# Variable names from here on down are from jf's proposal at: http://rainwave.cc/forums/viewtopic.php?f=13&t=1267
	sum_aasl = db.c.fetch_var("SELECT SUM(aasl) FROM (SELECT AVG(song_length) AS aasl FROM r4_album_sid JOIN r4_song_sid USING (album_id) JOIN r4_songs USING (song_id) WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS jfiscrazy", (sid,))
	if not sum_aasl:
		sum_aasl = 100
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
	# TODO: the base_rating formula/algorithm is broken, default to 4
	base_rating = 4
	# base_rating = db.c.fetch_var("SELECT SUM(tempvar) FROM (SELECT r4_album_sid.album_id, AVG(album_rating) * AVG(song_length) AS tempvar FROM r4_albums JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s) JOIN r4_song_sid ON (r4_albums.album_id = r4_song_sid.album_id) JOIN r4_songs USING (song_id) WHERE r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS hooooboy", (sid,))
	# if not base_rating:
	#	base_rating = 4
	log.debug("cooldown", "SID %s: base rating: %s" % (sid, base_rating))
	min_album_cool = config.get_station(sid, "cooldown_highest_rating_multiplier") * base_album_cool
	log.debug("cooldown", "SID %s: min_album_cool: %s" % (sid, min_album_cool))
	max_album_cool = min_album_cool + ((5 - 2.5) * ((base_album_cool - min_album_cool) / (5 - base_rating)))
	log.debug("cooldown", "SID %s: max_album_cool: %s" % (sid, max_album_cool))

	cooldown_config[sid]['sum_aasl'] = sum_aasl
	cooldown_config[sid]['avg_album_rating'] = avg_album_rating
	cooldown_config[sid]['multiplier_adjustment'] = multiplier_adjustment
	cooldown_config[sid]['base_album_cool'] = base_album_cool
	cooldown_config[sid]['base_rating'] = base_rating
	cooldown_config[sid]['min_album_cool'] = min_album_cool
	cooldown_config[sid]['max_album_cool'] = max_album_cool
	cooldown_config[sid]['time'] = int(time.time())

	average_song_length = db.c.fetch_var("SELECT AVG(song_length) FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_exists = TRUE AND sid = %s", (sid,))
	log.debug("cooldown", "SID %s: average_song_length: %s" % (sid, average_song_length))
	cooldown_config[sid]['average_song_length'] = average_song_length
	if not average_song_length:
		average_song_length = 160
	number_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s", (sid,))
	if not number_songs:
		number_songs = 1
	log.debug("cooldown", "SID %s: number_songs: %s" % (sid, number_songs))
	cooldown_config[sid]['max_song_cool'] = float(average_song_length) * (number_songs * config.get_station(sid, "cooldown_song_max_multiplier"))
	cooldown_config[sid]['min_song_cool'] = cooldown_config[sid]['max_song_cool'] * config.get_station(sid, "cooldown_song_min_multiplier")

def get_age_cooldown_multiplier(added_on):
	age_weeks = (int(time.time()) - added_on) / 604800.0
	cool_age_multiplier = 1.0
	if age_weeks < config.get("cooldown_age_threshold"):
		s2_end = config.get("cooldown_age_threshold")
		s2_start = config.get("cooldown_age_stage2_start")
		s2_min_multiplier = config.get("cooldown_age_stage2_min_multiplier")
		s1_min_multiplier = config.get("cooldown_age_stage1_min_multiplier")
		# Age Cooldown Stage 1
		if age_weeks <= s2_start:
			cool_age_multiplier = (age_weeks / s2_start) * (s2_min_multiplier - s1_min_multiplier) + s1_min_multiplier;
		# Age Cooldown Stage 2
		else:
			cool_age_multiplier = s2_min_multiplier + ((1.0 - s2_min_multiplier) * ((0.32436 - (s2_end / 288.0) + (math.pow(s2_end, 2.0) / 38170.0)) * math.log(2.0 * age_weeks + 1.0)))
	return cool_age_multiplier

def get_average_song_length(sid):
	return cooldown_config[sid]['average_song_length']

def get_random_song_timed(sid, target_seconds = None, target_delta = 30):
	"""
	Fetch a random song abiding by all election block, request block, and
	availability rules, but giving priority to the target song length
	provided.  Falls back to get_random_song on failure.
	"""
	if not target_seconds:
		return get_random_song(sid)

	sql_query = ("FROM r4_songs "
					"JOIN r4_song_sid USING (song_id) "
					"JOIN r4_album_sid ON (r4_album_sid.album_id = r4_song_sid.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_cool = FALSE "
					"AND song_elec_blocked = FALSE "
					"AND album_requests_pending IS NULL "
					"AND song_request_only = FALSE "
					"AND song_length >= %s AND song_length <= %s")
	num_available = db.c.fetch_var("SELECT COUNT(r4_song_sid.song_id) " + sql_query, (sid, (target_seconds - (target_delta / 2)), (target_seconds + (target_delta / 2))))
	if num_available == 0:
		log.info("song_select", "No songs available with target_seconds %s and target_delta %s." % (target_seconds, target_delta))
		log.debug("song_select", "Song select query: SELECT COUNT(r4_song_sid.song_id) " + sql_query % (sid, (target_seconds - (target_delta / 2)), (target_seconds + (target_delta / 2))))
		return get_random_song(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT r4_song_sid.song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, (target_seconds - target_delta), (target_seconds + target_delta), offset))
		return Song.load_from_id(song_id, sid)

def get_random_song(sid):
	"""
	Fetch a random song, abiding by all election block, request block, and
	availability rules.  Falls back to get_random_ignore_requests on failure.
	"""

	sql_query = ("FROM r4_song_sid "
					"JOIN r4_album_sid ON (r4_album_sid.album_id = r4_song_sid.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
				"WHERE r4_song_sid.sid = %s "
					"AND song_cool = FALSE "
					"AND song_request_only = FALSE "
					"AND song_elec_blocked = FALSE "
					"AND album_requests_pending IS NULL")
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	offset = 0
	if num_available == 0:
		log.info("song_select", "No songs available while ignoring request blocking rules.")
		return get_random_song_ignore_requests(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset))
		return Song.load_from_id(song_id, sid)

def get_random_song_ignore_requests(sid):
	"""
	Fetch a random song abiding by election block and availability rules,
	but ignoring request blocking rules.
	"""
	sql_query = ("FROM r4_song_sid "
			"WHERE r4_song_sid.sid = %s "
				"AND song_cool = FALSE "
				"AND song_request_only = FALSE "
				"AND song_elec_blocked = FALSE ")
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	offset = 0
	if num_available == 0:
		log.info("song_select", "No songs available.")
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
	sql_query = "FROM r4_song_sid WHERE r4_song_sid.sid = %s"
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	offset = 0
	if num_available == 0:
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
			"SELECT r4_albums.album_id AS id, album_name AS name, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, NULL AS fave, NULL AS rating_user "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"WHERE r4_album_sid.sid = %s "
			"ORDER BY album_name",
			(sid,))
	elif user.is_admin():
		# Same as a normal user, but add cooldown variables
		return db.c.fetch_all(
			"SELECT r4_albums.album_id AS id, album_cool_multiply AS cool_multiply, album_cool_override AS cool_override, album_name AS name, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, album_fave AS fave, album_rating_user AS rating_user "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s) "
			"WHERE r4_album_sid.sid = %s "
			"ORDER BY album_name",
			(user.id, sid))
	else:
		return db.c.fetch_all(
			"SELECT r4_albums.album_id AS id, album_name AS name, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, album_fave AS fave, album_rating_user AS rating_user "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s) "
			"WHERE r4_album_sid.sid = %s "
			"ORDER BY album_name",
			(user.id, sid))

def get_all_artists_list(sid):
	return db.c.fetch_all(
		"SELECT artist_name AS name, artist_id AS id, COUNT(*) AS song_count "
		"FROM r4_artists JOIN r4_song_artist USING (artist_id) JOIN r4_song_sid using (song_id) "
		"WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
		"GROUP BY artist_id, artist_name "
		"ORDER BY artist_name",
		(sid,))

def reduce_song_blocks(sid):
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked_num = song_elec_blocked_num - 1 WHERE song_elec_blocked = TRUE AND sid = %s", (sid,))
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked_num = 0, song_elec_blocked = FALSE WHERE song_elec_blocked_num <= 0 AND song_elec_blocked = TRUE AND sid = %s", (sid,))

def get_unrated_songs_for_user(user_id):
	return db.c.fetch_all(
		"SELECT r4_songs.song_id AS id, song_title AS title, album_name "
		"FROM r4_songs JOIN r4_song_sid USING (song_id) JOIN r4_albums USING (album_id) "
		"LEFT OUTER JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
		"WHERE song_verified = TRUE AND r4_song_ratings.song_id IS NULL ORDER BY album_name, song_title LIMIT 100", (user_id,))

def get_unrated_songs_for_requesting(user_id, sid, limit):
	return db.c.fetch_list(
		"SELECT MIN(song_id), r4_album_sid.album_id "
		"FROM r4_song_sid JOIN r4_album_sid USING (album_id, sid) "
		"LEFT OUTER JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
		"WHERE r4_song_sid.sid = %s song_verified = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE AND album_exists = TRUE "
		"AND r4_song_ratings.song_id IS NULL "
		"GROUP BY r4_album_sid.album_id "
		"LIMIT %s", (sid, sid, user_id, limit))

class SongHasNoSIDsException(Exception):
	pass

class SongNonExistent(Exception):
	pass

class SongMetadataUnremovable(Exception):
	pass

class Song(object):
	@classmethod
	def load_from_id(klass, song_id, sid = None):
		d = None
		if not sid:
			d = db.c.fetch_row("SELECT * FROM r4_songs WHERE song_id = %s", (song_id,))
		else:
			d = db.c.fetch_row("SELECT * FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.song_id = %s AND r4_song_sid.sid = %s", (song_id, sid))
		if not d:
			raise SongNonExistent

		s = klass()
		s.id = song_id
		s.sid = sid
		s.filename = d['song_filename']
		s.verified = d['song_verified']
		s.data['sids'] = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (song_id,))
		s.data['sid'] = sid
		s.data['rank'] = None
		s._assign_from_dict(d)

		s.albums = Album.load_list_from_song_id_sid(song_id, sid)
		s.artists = Artist.load_list_from_song_id(song_id)
		s.groups = SongGroup.load_list_from_song_id(song_id)

		return s

	@classmethod
	def load_from_file(klass, filename, sids):
		"""
		Produces an instance of the Song class with all album, group, and artist IDs loaded from only a filename.
		All metadata is saved to the database and updated where necessary.
		"""

		kept_artists = []
		kept_groups = []
		matched_entry = db.c.fetch_row("SELECT song_id FROM r4_songs WHERE song_filename = %s", (filename,))
		if matched_entry:
			s = klass.load_from_id(matched_entry['song_id'])
			for metadata in s.artists:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_artists.append(metadata)
			for metadata in s.groups:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_groups.append(metadata)
		elif len(sids) == 0:
			raise SongHasNoSIDsException
		else:
			s = klass()

		s.load_tag_from_file(filename)
		s.save(sids)

		new_artists = Artist.load_list_from_tag(s.artist_tag)
		new_groups = SongGroup.load_list_from_tag(s.genre_tag)
		new_albums = Album.load_list_from_tag(s.album_tag)

		for metadata in new_artists + new_groups:
			metadata.associate_song_id(s.id)
		if len(new_albums) > 0:
			new_albums[0].associate_song_id(s.id, sids)

		s.artists = new_artists + kept_artists
		s.albums = new_albums[0]
		s.groups = new_groups + kept_groups

		return s

	@classmethod
	def create_fake(klass, sid):
		if not config.test_mode:
			raise Exception("Tried to create a fake song when not in test mode.")

		s = klass()
		s.filename = "fake.mp3"
		s.data['title'] = "Test Song %s" % db.c.get_next_id("r4_songs", "song_id")
		s.artist_tag = "Test Artist %s" % db.c.get_next_id("r4_artists", "artist_id")
		s.album_tag = "Test Album %s" % db.c.get_next_id("r4_albums", "album_id")
		s.fake = True
		s.data['length'] = 60
		s.save([ sid ])
		return s

	def __init__(self):
		"""
		A blank Song object.  Please use one of the load functions to get a filled instance.
		"""
		self.id = None
		self.filename = None
		self.albums = None
		self.artists = None
		self.groups = None
		self.verified = False
		self.artist_tag = None
		self.album_tag = None
		self.genre_tag = None
		self.data = {}
		self.data['link'] = None
		self.data['link_text'] = None
		self.data['rating_allowed'] = False
		self.fake = False

	def load_tag_from_file(self, filename):
		"""
		Reads ID3 tags and sets object-level variables.
		"""

		f = MP3(filename)
		self.filename = filename
		keys = f.keys()
		if "TIT2" in keys:
			self.data['title'] = f["TIT2"][0]
		if "TPE1" in keys:
			self.artist_tag = f["TPE1"][0]
		if "TALB" in keys:
			self.album_tag = f["TALB"][0]
		if "TCON" in keys:
			self.genre_tag = f["TCON"][0]
		if "COMM" in keys:
			self.data['link_text'] = f["COMM"][0]
		elif "COMM::'XXX'" in keys:
			self.data['link_text'] = f["COMM::'XXX'"][0]
		if "WXXX:URL" in keys:
			self.data['link'] = f["WXXX:URL"].url
		elif "WXXX" in keys:
			self.data['link'] = f["WXXX"][0]
		if not "TXXX:REPLAYGAIN_TRACK_GAIN" in keys and config.get("mp3gain_scan"):
			# Run mp3gain quietly, finding peak while not clipping, output DB friendly, and preserving original timestamp
			process = subprocess.Popen([ "mp3gain", "-q", "-k", "-o", "-p", self.filename ], shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			process.wait()
		self.data['length'] = int(f.info.length)

	def is_valid(self):
		"""
		Lets callee know if this MP3 is valid or not.
		"""
		if config.test_mode and self.fake:
			self.verified = True
			return True

		if os.path.exists(self.filename):
			self.verified = True
			return True
		else:
			self.verified = False
			return False

	def save(self, sids_override = False):
		"""
		Save song to the database.  Does NOT associate metadata.
		"""
		update = False
		if self.id:
			update = True
		else:
			potential_id = None
			# To check for moved/duplicate songs we try to find if it exists in the db
			if self.artist_tag:
				potential_id = db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_title = %s AND song_length = %s AND song_artist_tag = %s", (self.data['title'], self.data['length'], self.artist_tag))
			else:
				potential_id = db.c.fetch_var("SELECT song_id FROM r4_songs WHERE song_title = %s AND song_length = %s", (self.data['title'], self.data['length']))
			if potential_id:
				self.id = potential_id
				update = True

		if sids_override:
			self.data['sids'] = sids_override
		elif len(self.data['sids']) == 0:
			raise SongHasNoSIDsException
		self.data['origin_sid'] = self.data['sids'][0]

		file_mtime = 0
		if not self.fake:
			file_mtime = os.stat(self.filename)[8]

		if update:
			db.c.update("UPDATE r4_songs \
				SET	song_filename = %s, \
					song_title = %s, \
					song_link = %s, \
					song_link_text = %s, \
					song_length = %s, \
					song_scanned = TRUE, \
					song_verified = TRUE, \
					song_file_mtime = %s \
				WHERE song_id = %s",
				(self.filename, self.data['title'], self.data['link'], self.data['link_text'], self.data['length'], file_mtime, self.id))
		else:
			self.id = db.c.get_next_id("r4_songs", "song_id")
			db.c.update("INSERT INTO r4_songs \
				(song_id, song_filename, song_title, song_link, song_link_text, song_length, song_origin_sid, song_file_mtime, song_verified, song_scanned) \
				VALUES \
				(%s,      %s           , %s        , %s       , %s            , %s         , %s             , %s             , %s           , %s )",
				(self.id, self.filename, self.data['title'], self.data['link'], self.data['link_text'], self.data['length'], self.data['origin_sid'], file_mtime, True, True))
			self.verified = True
			self.data['added_on'] = int(time.time())

		current_sids = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (self.id,))
		for sid in current_sids:
			if not self.data['sids'].count(sid):
				db.c.update("UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s AND sid = %s", (self.id, sid))
		for sid in self.data['sids']:
			if current_sids.count(sid):
				db.c.update("UPDATE r4_song_sid SET song_exists = TRUE WHERE song_id = %s AND sid = %s", (self.id, sid))
			else:
				db.c.update("INSERT INTO r4_song_sid (song_id, sid) VALUES (%s, %s)", (self.id, sid))

	def disable(self):
		db.c.update("UPDATE r4_songs SET song_verified = FALSE WHERE song_id = %s", (self.id,))
		db.c.update("UPDATE r4_song_sid SET song_exists = FALSE WHERE song_id = %s", (self.id,))
		for metadata in self.albums:
			metadata.reconcile_sids()

	def _assign_from_dict(self, d):
		for key, val in d.iteritems():
			if key.find("song_") == 0:
				key = key[5:]
			# Skip any album-related values
			if key.find("album_") == 0:
				pass
			else:
				self.data[key] = val

	def start_cooldown(self, sid):
		"""
		Calculates cooldown based on jfinalfunk's crazy algorithms.
		Cooldown may be overriden by song_cool_* rules found in database.
		"""

		cool_time = cooldown_config[sid]['max_song_cool']
		if self.data['cool_override']:
			cool_time = self.data['cool_override']
		else:
			cool_rating = self.data['rating']
			# If no rating exists, give it a middle rating
			if not self.data['rating'] or self.data['rating'] == 0:
				cool_rating = 3
			auto_cool = cooldown_config[sid]['min_song_cool'] + (((4 - (cool_rating - 1)) / 4.0) * (cooldown_config[sid]['max_song_cool'] - cooldown_config[sid]['min_song_cool']))
			cool_time = auto_cool * get_age_cooldown_multiplier(self.data['added_on']) * self.data['cool_multiply']

		cool_time = int(cool_time + time.time())
		log.debug("cooldown", "Song ID %s Station ID %s cool_time period: %s" % (self.id, sid, cool_time))
		db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND sid = %s", (cool_time, self.id, sid))
		self.data['cool'] = True
		self.data['cool_end'] = cool_time

		if 'request_only_end' in self.data and self.data['request_only_end'] != None:
			self.data['request_only_end'] = self.data['cool_end'] + config.get_station(sid, "cooldown_request_only_period")
			self.data['request_only'] = True
			db.c.update("UPDATE r4_song_sid SET song_request_only = TRUE, song_request_only_end = %s WHERE song_id = %s AND sid = %s", (self.data['request_only_end'], self.id, sid))

		for metadata in self.groups:
			log.debug("song_cooldown", "Starting group cooldown on group %s" % metadata.id)
			metadata.start_cooldown(sid)
		# Albums always have to go last since album records in the DB store cached cooldown values
		for metadata in self.albums:
			log.debug("song_cooldown", "Starting album cooldown on group %s" % metadata.id)
			metadata.start_cooldown(sid)

	def start_election_block(self, sid, num_elections):
		for metadata in self.groups:
			metadata.start_election_block(sid, num_elections)
		for metadata in self.albums:
			metadata.start_election_block(sid, num_elections)
		self.set_election_block(sid, "in_election", num_elections)

	def set_election_block(self, sid, blocked_by, block_length):
		db.c.update("UPDATE r4_song_sid SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s WHERE song_id = %s AND sid = %s AND song_elec_blocked_num <= %s", (blocked_by, block_length, self.id, sid, block_length))
		self.data['elec_blocked_num'] = block_length
		self.data['elec_blocked_by'] = blocked_by
		self.data['elec_blocked'] = True

	def update_rating(self, skip_album_update = False):
		"""
		Calculate an updated rating from the database.
		"""
		dislikes = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_rating_user < 3 GROUP BY song_id", (self.id,))
		if not dislikes:
			dislikes = 0
		neutrals = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_rating_user >= 3 AND song_rating_user < 3.5 GROUP BY song_id", (self.id,));
		if not neutrals:
			neutrals = 0
		neutralplus = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_rating_user >= 3.5 AND song_rating_user < 4 GROUP BY song_id", (self.id,));
		if not neutralplus:
			neutralplus = 0
		likes = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_rating_user >= 4 GROUP BY song_id", (self.id,));
		if not likes:
			likes = 0
		rating_count = dislikes + neutrals + neutralplus + likes
		if rating_count > config.get("rating_threshold_for_calc"):
			self.rating = round(((((likes + (neutrals * 0.5) + (neutralplus * 0.75)) / (likes + dislikes + neutrals + neutralplus) * 4.0)) + 1), 1)
			db.c.update("UPDATE r4_songs SET song_rating = %s, song_rating_count = %s WHERE song_id = %s", (self.rating, rating_count, self.id))

		if not skip_album_update:
			for album in self.albums:
				album.update_rating()

	def add_artist(self, name):
		return self._add_metadata(self.artists, name, Artist)

	def add_album(self, name, sids = None):
		if not sids and not 'sids' in self.data:
			raise TypeError("add_album() requires a station ID list if song was not loaded/saved into database")
		elif not sids:
			sids = self.data['sids']
		for metadata in self.albums:
			if metadata.data['name'] == name:
				return True
		new_md = Album.load_from_name(name)
		new_md.associate_song_id(self.id, sids)
		self.albums.append(new_md)
		return True

	def add_group(self, name):
		return self._add_metadata(self.groups, name, SongGroup)

	def _add_metadata(self, lst, name, klass):
		for metadata in lst:
			if metadata.data['name'] == name:
				return True
		new_md = klass.load_from_name(name)
		new_md.associate_song_id(self.id)
		lst.append(new_md)
		return True

	def remove_artist_id(self, metadata_id):
		return self._remove_metadata_id(self.artists, metadata_id)

	def remove_album_id(self, metadata_id):
		return self._remove_metadata_id(self.albums, metadata_id)

	def remove_group_id(self, metadata_id):
		return self._remove_metadata_id(self.groups, metadata_id)

	def _remove_metadata_id(self, lst, metadata_id):
		for metadata in lst:
			if metadata.id == metadata_id and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by ID %s that wasn't assigned by ID3." % metadata_id)

	def remove_artist(self, name):
		return self._remove_metadata(self.artists, name)

	def remove_album(self, name):
		return self._remove_metadata(self.albums, name)

	def remove_group(self, name):
		return self._remove_metadata(self.groups, name)

	def remove_nontag_metadata(self):
		for metadata in (self.albums + self.artists + self.groups):
			if not metadata.is_tag:
				metadata.disassociate_song_id(self.id)

	def _remove_metadata(self, lst, name):
		for metadata in lst:
			if metadata.data['name'] == name and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by name %s that wasn't assigned by ID3." % name)

	def load_extra_detail(self):
		self.data['fave_count'] = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings WHERE song_fave = TRUE AND song_id = %s", (self.id,))
		self.data['rating_rank'] = 1 + db.c.fetch_var("SELECT COUNT(song_id) FROM r4_songs WHERE song_rating > %s", (self.data['rating'],))
		self.data['vote_rank'] = 1 + db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE sid = %s AND song_vote_total > %s", (self.data['sid'], self.data['vote_total']))
		self.data['request_rank'] = 1 + db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE sid = %s AND song_request_count > %s", (self.data['sid'], self.data['request_count']))

		self.data['rating_histogram'] = {}
		histo = db.c.fetch_all("SELECT "
							   "ROUND(((song_rating_user * 10) - (CAST(song_rating_user * 10 AS SMALLINT) %% 5))) / 10 AS rating_user_rnd, "
							   "COUNT(song_rating_user) AS rating_user_count "
							   "FROM r4_song_ratings JOIN phpbb_users USING (user_id) "
							   "WHERE radio_inactive = FALSE AND song_id = %s "
							   "GROUP BY rating_user_rnd "
							   "ORDER BY rating_user_rnd",
							   (self.id,))
		for point in histo:
			self.data['rating_histogram'][str(point['rating_user_rnd'])] = point['rating_user_count']

	def to_dict(self, user = None):
		self.data['id'] = self.id
		self.data['artists'] = []
		self.data['albums'] = []
		self.data['groups'] = []
		if self.albums:
			for metadata in self.albums:
				self.data['albums'].append(metadata.to_dict(user))
		if self.artists:
			for metadata in self.artists:
				self.data['artists'].append(metadata.to_dict(user))
		if self.groups:
			for metadata in self.groups:
				self.data['groups'].append(metadata.to_dict(user))
		self.data['rating_user'] = None
		self.data['fave'] = None
		if user:
			self.data.update(rating.get_song_rating(self.id, user.id))
			if user.data['radio_rate_anything']:
				self.data['rating_allowed'] = True
		return self.data

	def get_all_ratings(self):
		table = db.c.fetch_all("SELECT song_rating_user, song_fave, user_id FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s", (self.id,))
		all_ratings = {}
		for row in all_ratings:
			all_ratings[row['user_id']] = { "rating_user": row['song_rating_user'], "fave": row['song_fave'] }
		return all_ratings

	def update_last_played(self, sid):
		for album in self.albums:
			album.update_last_played(sid)
		return db.c.update("UPDATE r4_song_sid SET song_played_last = %s WHERE song_id = %s AND sid = %s", (time.time(), self.id, sid))

	def add_to_vote_count(self, votes, sid):
		return db.c.update("UPDATE r4_song_sid SET song_vote_total = song_vote_total + %s WHERE song_id = %s AND sid = %s", (votes, self.id, sid))

	def check_rating_acl(self, user):
		if self.data['rating_allowed']:
			return
			
		if user.data['radio_rate_anything']:
			self.data['rating_allowed'] = True
			return

		acl = cache.get_station(self.sid, "user_rating_acl")
		if self.id in acl and user.id in acl[self.id]:
			self.data['rating_allowed'] = True
		else:
			self.data['rating_allowed'] = False

	def length(self):
		return self.data['length']

# ################################################################### ASSOCIATED DATA TEMPLATE

class MetadataInsertionError(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class MetadataUpdateError(MetadataInsertionError):
	pass

class MetadataNotNamedError(MetadataInsertionError):
	pass

class MetadataNotFoundError(MetadataInsertionError):
	pass

class AssociatedMetadata(object):
	select_by_name_query = None 		# one %s argument: name
	select_by_id_query = None			# one %s argument: id
	select_by_song_id_query = None		# one %s argument: song_id
	disassociate_song_id_query = None	# two %s argument: song_id, id
	associate_song_id_query = None		# three %s argument: song_id, id, is_tag
	check_self_size_query = None			# one argument: id
	delete_self_query = None		# one argument: id

	@classmethod
	def load_from_name(klass, name):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_name_query, (name,))
		if data:
			instance._assign_from_dict(data)
		else:
			instance.data['name'] = name
			instance.save()
		return instance

	@classmethod
	def load_from_id(klass, metadata_id):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_id_query, (metadata_id,))
		if not data:
			raise MetadataNotFoundEror("%s ID %s could not be found." % (klass.__name__, metadata_id))
		instance._assign_from_dict(data)
		return instance

	@classmethod
	def load_list_from_tag(klass, tag):
		if not tag:
			return []
		instances = []
		for fragment in tag.split(","):
			if len(fragment) > 0:
				instance = klass.load_from_name(fragment.strip())
				instance.is_tag = True
				instances.append(instance)
		return instances

	@classmethod
	def load_list_from_song_id(klass, song_id):
		instances = []
		for row in db.c.fetch_all(klass.select_by_song_id_query, (song_id,)):
			instance = klass()
			instance._assign_from_dict(row)
			instances.append(instance)
		return instances

	def __init__(self):
		self.id = None
		self.is_tag = False
		self.elec_block = None
		self.cool_time = None

		self.data = {}
		self.data['name'] = None

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.data['name'] = d["name"]
		if d.has_key("is_tag"):
			self.is_tag = d["is_tag"]
		if d.has_key("elec_block") and d['elec_block'] is not None:
			self.elec_block = d["elec_block"]
		if d.has_key("cool_time") and d['cool_time'] is not None:
			self.cool_time = d["cool_time"]
		if d.has_key("cool_override") and d['cool_override'] is not None:
			self.cool_time = d['cool_override']

	def save(self):
		if not self.id and self.data['name']:
			if not self._insert_into_db():
				raise MetadataInsertionError("%s with name \"%s\" could not be inserted into the database." % (self.__class__.__name__, self.data['name']))
		elif self.id:
			if not self._update_db():
				raise MetadataUpdateError("%s with ID %s could not be updated." % (self.__class__.__name__, self.id))
		else:
			raise MetadataNotNamedError("Tried to save a %s without a name" % self.__class__.__name__)

	def _insert_into_db():
		return False

	def _update_db():
		return False

	def start_election_block(self, sid, num_elections = False):
		if self.elec_block is not None:
			if self.elec_block > 0:
				log.debug("elec_block", "%s SID %s blocking ID %s for override %s" % (self.__class__.__name__, sid, self.id, self.elec_block))
				self._start_election_block_db(sid, self.elec_block)
		elif num_elections:
			log.debug("elec_block", "%s SID %s blocking ID %s for normal %s" % (self.__class__.__name__, sid, self.id, num_elections))
			self._start_election_block_db(sid, num_elections)

	def start_cooldown(self, sid, cool_time = False):
		if self.cool_time is not None:
			self._start_cooldown_db(sid, self.cool_time)
		elif cool_time and cool_time > 0:
			self._start_cooldown_db(sid, cool_time)	

	def associate_song_id(self, song_id, is_tag = None):
		if is_tag == None:
			is_tag = self.is_tag
		else:
			self.is_tag = is_tag
		if db.c.fetch_var(self.has_song_id_query, (song_id, self.id)) > 0:
			pass
		else:
			if not db.c.update(self.associate_song_id_query, (song_id, self.id, is_tag)):
				raise MetadataUpdateError("Cannot associate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))

	def disassociate_song_id(self, song_id, is_tag = True):
		if not db.c.update(self.disassociate_song_id_query, (song_id, self.id)):
			raise MetadataUpdateError("Cannot disassociate song ID %s with %s ID %s" % (song_id, self.__class__.__name__, self.id))
		if db.c.fetch_var(self.check_self_size_query, (self.id,)) == 0:
			db.c.update(self.delete_self_query, (self.id,))

	def to_dict(self, user = None):
		self.data['id'] = self.id
		return self.data

# ################################################################### ALBUMS

updated_album_ids = {}

def clear_updated_albums(sid):
	global updated_album_ids
	updated_album_ids[sid] = {}

def get_updated_albums_dict(sid):
	global updated_album_ids
	if not sid in updated_album_ids:
		return []

	previous_newest_album = cache.get_station(sid, "newest_album")
	if not previous_newest_album:
		cache.set_station(sid, "newest_album", time.time())
	else:
		newest_albums = db.c.fetch_list("SELECT album_id FROM r4_albums JOIN r4_album_sid USING (album_id) WHERE sid = %s AND album_added_on > %s", (sid, previous_newest_album))
		for album_id in newest_albums:
			updated_album_ids[sid][album_id] = True
		cache.set_station(sid, "newest_album", time.time())
	album_diff = []
	for album_id in updated_album_ids[sid]:
		album = Album.load_from_id_sid(album_id, sid)
		album.solve_cool_lowest(sid)
		album_diff.append(album.to_dict())
	return album_diff

def warm_cooled_albums(sid):
	global updated_album_ids
	album_list = db.c.fetch_list("SELECT album_id FROM r4_album_sid WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE", (sid, time.time()))
	for album_id in album_list:
		updated_album_ids[sid][album_id] = True
	db.c.update("UPDATE r4_album_sid SET album_cool = FALSE WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE", (sid, time.time()))

class Album(AssociatedMetadata):
	select_by_name_query = "SELECT r4_albums.* FROM r4_albums WHERE album_name = %s"
	select_by_id_query = "SELECT r4_albums.* FROM r4_albums WHERE album_id = %s"
	select_by_song_id_query = "SELECT r4_albums.* FROM r4_song_sid JOIN r4_albums USING (album_id) WHERE song_id = %s ORDER BY r4_albums.album_name"
	# disassociate_song_id_query = "UPDATE r4_song_sid SET album_id = NULL,  WHERE song_id = %s AND album_id = %s"
	# has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_sid WHERE song_id = %s AND album_id = %s"
	# This is a hack, but,umm..... yeah.  It'll do. :P  reconcile_sids handles these duties.
	check_self_size_query = "SELECT 1, %s"
	# delete_self_query will never run, but just in case
	delete_self_query = "SELECT 1, %s"

	@classmethod
	def load_list_from_song_id_sid(cls, song_id, sid):
		if not sid:
			return cls.load_list_from_song_id(song_id)
		instances = []
		for row in db.c.fetch_all("SELECT r4_albums.*, album_cool_lowest, album_cool_multiply, album_cool_override, album_cool FROM r4_song_sid JOIN r4_albums USING (album_id) JOIN r4_album_sid USING (album_id) WHERE song_id = %s AND r4_song_sid.sid = %s AND r4_album_sid.sid = %s ORDER BY r4_albums.album_name", (song_id, sid, sid)):
			instance = cls()
			instance._assign_from_dict(row)
			instance.data['sids'] = [ sid ]
			instances.append(instance)
		return instances

	@classmethod
	def load_from_id_sid(cls, album_id, sid):
		row = db.c.fetch_row("SELECT r4_albums.*, album_cool, album_cool_lowest, album_cool_multiply, album_cool_override FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s", (album_id, sid))
		if not row:
			raise MetadataNotFoundError("%s ID %s could not be found." % (cls.__name__, album_id))
		instance = cls()
		instance._assign_from_dict(row)
		instance.data['sids'] = [ sid ]
		return instance

	@classmethod
	def load_from_id_with_songs(cls, album_id, sid, user = None):
		row = db.c.fetch_row("SELECT * FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s", (album_id, sid))
		if not row:
			raise MetadataNotFoundError("%s ID %s could not be found." % (cls.__name__, album_id))
		instance = cls()
		instance._assign_from_dict(row)
		instance.data['sids'] = [ sid ]
		if not user or user.is_anonymous():
			instance.data['songs'] = db.c.fetch_all(
				"SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, "
					"song_cool AS cool, song_cool_end AS cool_end, song_link AS link, song_link_text AS link_text, "
					"song_rating AS rating, 0 AS rating_user, NULL AS fave, "
					"string_agg(r4_artists.artist_id || ':' || r4_artists.artist_name,  ',') AS artist_parseable "
				"FROM r4_song_sid "
					"JOIN r4_songs USING (song_id) "
					"JOIN r4_song_artist USING (song_id) "
					"JOIN r4_artists USING (artist_id) "
				"WHERE r4_song_sid.sid = %s AND r4_song_sid.album_id = %s "
				"GROUP BY r4_song_sid.song_id, song_length, song_origin_sid, song_title, song_cool, song_cool_end, song_link, song_link_text, song_rating "
				"ORDER BY song_title",
				(sid, instance.id,))
		else:
			instance.data['songs'] = db.c.fetch_all(
				"SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, "
					"song_cool AS cool, song_cool_end AS cool_end, song_link AS link, song_link_text AS link_text, "
					"song_rating AS rating, song_cool_multiply AS cool_multiply, song_cool_override AS cool_override, "
					"song_rating_user AS rating_user, song_fave AS fave, "
					"string_agg(r4_artists.artist_id || ':' || r4_artists.artist_name,  ',') AS artist_parseable "
				"FROM r4_song_sid "
					"JOIN r4_songs USING (song_id) "
					"JOIN r4_song_artist USING (song_id) "
					"JOIN r4_artists USING (artist_id) "
					"LEFT JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
				"WHERE r4_song_sid.sid = %s AND r4_song_sid.album_id = %s "
				"GROUP BY r4_song_sid.song_id, song_length, song_origin_sid, song_title, song_cool, song_cool_end, song_link, song_link_text, song_rating, song_rating_user, song_fave, song_cool_override, song_cool_multiply "
				"ORDER BY song_title",
				(user.id, sid, instance.id))
		return instance

	def __init__(self):
		super(Album, self).__init__()
		self.data['sids'] = []

	def _insert_into_db(self):
		global updated_album_ids

		self.id = db.c.get_next_id("r4_albums", "album_id")
		success = db.c.update("INSERT INTO r4_albums (album_id, album_name) VALUES (%s, %s)", (self.id, self.data['name']))
		for sid in self.data['sids']:
			updated_album_ids[sid][self.id] = True
		return success

	def _update_db(self):
		global updated_album_ids

		success = db.c.update("UPDATE r4_albums SET album_name = %s, album_rating = %s WHERE album_id = %s", (self.data['name'], self.data['rating'], self.id))
		for sid in self.data['sids']:
			updated_album_ids[sid][self.id] = True
		return success

	def _assign_from_dict(self, d):
		self.id = d['album_id']
		self.data['name'] = d['album_name']
		self.data['rating'] = d['album_rating']
		self.data['rating_count'] = d['album_rating_count']
		self.data['added_on'] = d['album_added_on']
		self._dict_check_assign(d, "album_added_on")
		self._dict_check_assign(d, "album_cool_multiply", 1)
		self._dict_check_assign(d, "album_cool_override")
		self._dict_check_assign(d, "album_cool_lowest", 0)
		self._dict_check_assign(d, "album_played_last", 0)
		self._dict_check_assign(d, "album_vote_total", 0)
		self._dict_check_assign(d, "album_request_count", 0)
		self._dict_check_assign(d, "album_cool", False)
		if d.has_key('sid'):
			self.data['sid'] = d['sid']
		if d.has_key('album_is_tag'):
			self.is_tag = d['album_is_tag']
		if os.path.isfile(os.path.join(config.get("album_art_file_path"), "%s.jpg" % self.id)):
			self.data['art'] = config.get("album_art_url_path") + "/" + str(self.id)
		else:
			self.data['art'] = None

	def _dict_check_assign(self, d, key, default = None, new_key = None):
		if not new_key and key.find("album_") == 0:
			new_key = key[6:]
		if d.has_key(key):
			self.data[new_key] = d[key]
		else:
			self.data[new_key] = default

	def associate_song_id(self, song_id, sids, is_tag = None):
		do_reconciliation = False
		for sid in sids:
			if not db.c.fetch_var("SELECT COUNT(*) FROM r4_song_sid WHERE song_id = %s AND sid = %s", (song_id, sid)):
				raise Exception("Song ID %s has not been associated with station %s yet." % (song_id, sid))
			# belongs = db.c.fetch_var("SELECT album_id FROM r4_song_sid WHERE song_id = %s AND album_id = %s AND sid = %s", (song_id, self.id, sid))
			belongs = db.c.fetch_var("SELECT album_id FROM r4_song_sid WHERE song_id = %s AND sid = %s", (song_id, sid))
			if not belongs: # belongs != self.id:
				do_reconciliation = True
				db.c.update("UPDATE r4_song_sid SET album_id = %s WHERE song_id = %s AND sid = %s", (self.id, song_id, sid))
		if do_reconciliation:
			# Update the cached number of songs this album has
			num_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM (SELECT DISTINCT song_id FROM r4_song_sid WHERE album_id = %s) AS temp", (self.id,))
			db.c.update("UPDATE r4_albums SET album_song_count = %s WHERE album_id = %s", (num_songs, self.id))
			self.reconcile_sids()

	def disassociate_song_id(self, song_id):
		"""
		Removed.  Can be called, won't actually do anything.
		Use associate_song_id to change an associated song's album ID.
		"""
		pass
		#super(Album, self).disassociate_song_id(song_id)
		#self.reconcile_sids()

	def reconcile_sids(self, album_id = None):
		if not album_id:
			album_id = self.id
		new_sids = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE album_id = %s AND song_exists = TRUE GROUP BY sid", (album_id,))
		current_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE", (album_id,))
		old_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = FALSE", (album_id,))
		for sid in current_sids:
			if not new_sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = FALSE WHERE album_id = %s AND sid = %s", (album_id, sid))
		for sid in new_sids:
			if current_sids.count(sid):
				pass
			elif old_sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = TRUE WHERE album_id = %s AND sid = %s", (album_id, sid))
			else:
				db.c.update("INSERT INTO r4_album_sid (album_id, sid) VALUES (%s, %s)", (album_id, sid))
		self.data['sids'] = new_sids
		for sid in self.data['sids']:
			updated_album_ids[sid][album_id] = True

	def start_cooldown(self, sid, cool_time = False):
		global cooldown_config

		if cool_time:
			pass
		elif self.data['cool_override']:
			cool_time = self.data['cool_override']
		else:
			cool_rating = self.data['rating']
			if not cool_rating or cool_rating == 0:
				cool_rating = 3
			# AlbumCD = minAlbumCD + ((maxAlbumR - albumR)/(maxAlbumR - minAlbumR)*(maxAlbumCD - minAlbumCD))
			# old: auto_cool = cooldown_config[sid]['min_album_cool'] + (((4 - (cool_rating - 1)) / 4.0) * (cooldown_config[sid]['max_album_cool'] - cooldown_config[sid]['min_album_cool']))
			auto_cool = cooldown_config[sid]['min_album_cool'] + (((5 - cool_rating) / 4.0) * (cooldown_config[sid]['max_album_cool'] - cooldown_config[sid]['min_album_cool']))
			album_num_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE album_id = %s AND song_exists = TRUE AND sid = %s", (self.id, sid))
			log.debug("cooldown", "min_album_cool: %s .. max_album_cool: %s .. auto_cool: %s .. album_num_songs: %s .. rating: %s" % (cooldown_config[sid]['min_album_cool'], cooldown_config[sid]['max_album_cool'], auto_cool, album_num_songs, cool_rating))
			cool_size_multiplier = config.get_station(sid, "cooldown_size_min_multiplier") + (config.get_station(sid, "cooldown_size_max_multiplier") - config.get_station(sid, "cooldown_size_min_multiplier")) / (1 + math.pow(2.7183, (config.get_station(sid, "cooldown_size_slope") * (album_num_songs - config.get_station(sid, "cooldown_size_slope_start")))) / 2);
			cool_age_multiplier = get_age_cooldown_multiplier(self.data['added_on'])
			cool_time = int(auto_cool * cool_size_multiplier * cool_age_multiplier * self.data['cool_multiply'])
			log.debug("cooldown", "auto_cool: %s .. cool_size_multiplier: %s .. cool_age_multiplier: %s .. cool_multiply: %s .. cool_time: %s" %
					  (auto_cool, cool_size_multiplier, cool_age_multiplier, self.data['cool_multiply'], cool_time))
		updated_album_ids[sid][self.id] = True
		log.debug("cooldown", "Album ID %s Station ID %s cool_time period: %s" % (self.id, sid, cool_time))
		return self._start_cooldown_db(sid, cool_time)

	def _start_cooldown_db(self, sid, cool_time):
		cool_end = int(cool_time + time.time())
		if db.c.allows_join_on_update:
			db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s "
						"WHERE album_id = %s AND sid = %s AND song_cool_end < %s",
						(cool_end, self.id, sid, cool_end))
		else:
			songs = db.c.fetch_list("SELECT song_id FROM r4_song_sid WHERE album_id = %s AND sid = %s AND song_exists = TRUE", (self.id, sid))
			for song_id in songs:
				db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND song_cool_end < %s AND sid = %s", (cool_end, song_id, cool_end, sid))

	def solve_cool_lowest(self, sid):
		self.data['cool_lowest'] = db.c.fetch_var("SELECT MIN(song_cool_end) FROM r4_song_sid WHERE album_id = %s AND sid = %s AND song_exists = TRUE", (self.id, sid))
		if self.data['cool_lowest'] > time.time():
			self.data['cool'] = True
		else:
			self.data['cool'] = False
		db.c.update("UPDATE r4_album_sid SET album_cool_lowest = %s, album_cool = %s WHERE album_id = %s AND sid = %s", (self.data['cool_lowest'], self.data['cool'], self.id, sid))
		return self.data['cool_lowest']

	def update_rating(self):
		dislikes = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_rating_user < 3 GROUP BY album_id", (self.id,))
		if not dislikes:
			dislikes = 0
		neutrals = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_rating_user >= 3 AND album_rating_user < 3.5 GROUP BY album_id", (self.id,));
		if not neutrals:
			neutrals = 0
		neutralplus = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_rating_user >= 3.5 AND album_rating_user < 4 GROUP BY album_id", (self.id,));
		if not neutralplus:
			neutralplus = 0
		likes = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_rating_user >= 4 GROUP BY album_id", (self.id,));
		if not likes:
			likes = 0
		rating_count = dislikes + neutrals + neutralplus + likes
		if rating_count > config.get("rating_threshold_for_calc"):
			self.rating = round(((((likes + (neutrals * 0.5) + (neutralplus * 0.75)) / (likes + dislikes + neutrals + neutralplus) * 4.0)) + 1), 1)
			db.c.update("UPDATE r4_albums SET album_rating = %s, album_rating_count = %s WHERE album_id = %s", (self.rating, rating_count, self.id))

	def update_last_played(self, sid):
		return db.c.update("UPDATE r4_album_sid SET album_played_last = %s WHERE album_id = %s AND sid = %s", (time.time(), self.id, sid))

	def update_vote_total(self, sid):
		vote_total = db.c.fetch_var("SELECT SUM(song_vote_total) FROM r4_song_sid WHERE album_id = %s AND song_exists = TRUE", (self.id,))
		return db.c.update("UPDATE r4_album_sid SET album_vote_total = %s WHERE album_id = %s AND sid = %s", (vote_total, self.id, sid))

	def get_all_ratings(self):
		table = db.c.fetch_all("SELECT album_rating_user, album_fave, user_id FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s", (self.id,))
		all_ratings = {}
		for row in table:
			all_ratings[row['user_id']] = { "rating_user": row['album_rating_user'], "fave": row['album_fave'] }
		return all_ratings

	def update_all_user_ratings(self):
		db.c.update(
			"WITH "
				"faves AS ( "
					"DELETE FROM r4_album_ratings WHERE album_id = %s RETURNING * "
				"), "
				"ratings AS ( "
					"SELECT album_id, NULL AS album_fave, user_id, ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS album_rating_user "
					"FROM ("
						"SELECT DISTINCT song_id, album_id FROM r4_song_sid WHERE album_id = %s"
					") AS r4_song_sid LEFT JOIN r4_song_ratings USING (song_id) "
					"GROUP BY album_id, user_id "
				") "
			"INSERT INTO r4_album_ratings (album_id, user_id, album_fave, album_rating_user) "
			"SELECT album_id, user_id, BOOL_OR(album_fave) AS album_fave, NULLIF(MAX(album_rating_user), 0) AS album_rating_user "
			"FROM (SELECT * FROM (SELECT album_id, album_fave, user_id, 0 AS album_rating_user FROM faves) AS faves UNION ALL SELECT * FROM ratings) AS fused "
			"GROUP BY album_id, user_id "
			"HAVING BOOL_OR(album_fave) = TRUE OR MAX(album_rating_user) IS NOT NULL ",
			(self.id, self.id))

	def reset_user_completed_flags(self):
		db.c.update("UPDATE r4_album_ratings SET album_rating_complete = FALSE WHERE album_id = %s", (self.id,))

	def _start_election_block_db(self, sid, num_elections):
		if db.c.allows_join_on_update:
			# refer to song.set_election_block for base SQL
			db.c.update("UPDATE r4_song_sid "
						"SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s "
						"WHERE album_id = %s AND sid = %s AND song_elec_blocked_num <= %s",
						('album', num_elections, self.id, sid, num_elections))
		else:
			table = db.c.fetch_all("SELECT song_id FROM r4_song_sid WHERE album_id = %s AND sid = %s", (self.id, sid))
			for row in table:
				song = Song()
				song.id = row['song_id']
				song.set_election_block(sid, 'album', num_elections)

	def load_extra_detail(self, sid):
		self.data['fave_count'] = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings WHERE album_id = %s AND album_fave = TRUE", (self.id,))
		self.data['rating_rank'] = 1 + db.c.fetch_var("SELECT COUNT(album_id) FROM r4_albums WHERE album_rating > %s", (self.data['rating'],))
		self.data['vote_rank'] = 1 + db.c.fetch_var("SELECT COUNT(album_id) FROM r4_album_sid WHERE sid = %s AND album_vote_total > %s", (sid, self.data['vote_total']))
		self.data['request_rank'] = 1+ db.c.fetch_var("SELECT COUNT(album_id) FROM r4_album_sid WHERE sid = %s AND album_request_count > %s", (sid, self.data['request_count']))

		self.data['genres'] = db.c.fetch_all(
			"SELECT DISTINCT group_id AS id, group_name AS name "
			"FROM r4_song_sid JOIN r4_song_group USING (song_id) JOIN r4_groups USING (group_id) "
			"WHERE album_id = %s",
			(self.id,))

		self.data['rating_histogram'] = {}
		histo = db.c.fetch_all("SELECT "
							   "ROUND(((album_rating_user * 10) - (CAST(album_rating_user * 10 AS SMALLINT) %% 5))) / 10 AS rating_rnd, "
							   "COUNT(album_rating_user) AS rating_count "
							   "FROM r4_album_ratings JOIN phpbb_users USING (user_id) "
							   "WHERE radio_inactive = FALSE AND album_id = %s "
							   "GROUP BY rating_rnd "
							   "ORDER BY rating_rnd",
							   (self.id,))
		for point in histo:
			self.data['rating_histogram'][str(point['rating_rnd'])] = point['rating_count']

	def to_dict(self, user = None):
		d = super(Album, self).to_dict(user)
		if user:
			self.data.update(rating.get_album_rating(self.id, user.id))
		else:
			d['rating_user'] = None
			d['fave'] = None
		return d

class Artist(AssociatedMetadata):
	select_by_name_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE artist_name = %s"
	select_by_id_query = "SELECT artist_id AS id, artist_name AS name FROM r4_artists WHERE artist_id = %s"
	select_by_song_id_query = "SELECT r4_artists.artist_id AS id, r4_artists.artist_name AS name, r4_song_artist.artist_is_tag AS is_tag FROM r4_song_artist JOIN r4_artists USING (artist_id) WHERE song_id = %s"
	disassociate_song_id_query = "DELETE FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_artist (song_id, artist_id, artist_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_artist WHERE song_id = %s AND artist_id = %s"
	check_self_size_query = "SELECT COUNT(song_id) FROM r4_song_artist JOIN r4_songs USING (song_id) WHERE artist_id = %s AND song_verified = TRUE"
	delete_self_query = "DELETE FROM r4_artists WHERE artist_id = %s"

	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_artists", "artist_id")
		return db.c.update("INSERT INTO r4_artists (artist_id, artist_name) VALUES (%s, %s)", (self.id, self.data['name']))

	def _update_db(self):
		return db.c.update("UPDATE r4_artists SET artist_name = %s WHERE artist_id = %s", (self.name, self.id))

	def _start_cooldown_db(self, sid, cool_time):
		# Artists don't have cooldowns on Rainwave.
		pass

	def _start_election_block_db(self, sid, num_elections):
		# Artists don't block elections either (OR DO THEY)
		pass

	def load_all_songs(self, sid, user_id = None):
		# I'm not going to provide a list of Song objects here because the overhead of that would spiral out of control
		self.data['songs'] = db.c.fetch_all(
			"SELECT r4_song_artist.song_id AS id, r4_song_sid.sid AS sid, song_rating AS rating, song_title AS title, "
				"r4_song_sid.album_id AS album_id, album_name, song_length AS length, song_cool AS cool, song_cool_end AS cool_end, "
				"song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_song_artist "
				"JOIN r4_songs USING (song_id) "
				"JOIN r4_song_sid USING (song_id) "
				"JOIN r4_albums USING (album_id) "
				"LEFT JOIN r4_song_ratings ON (r4_song_artist.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s) "
			"WHERE r4_song_artist.artist_id = %s "
			"ORDER BY r4_song_sid.sid, album_name, song_title",
			(user_id, self.id))

		for song in self.data['songs']:
			song['albums'] = [ { "name": song['album_name'], "id": song['album_id'] } ]
			song.pop('album_name', None)
			song.pop('album_id', None)

class SongGroup(AssociatedMetadata):
	select_by_name_query = "SELECT group_id AS id, group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE group_name = %s"
	select_by_id_query = "SELECT group_id AS id, group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_groups WHERE group_id = %s"
	select_by_song_id_query = "SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time, group_is_tag AS is_tag FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s"
	disassociate_song_id_query = "DELETE FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	associate_song_id_query = "INSERT INTO r4_song_group (song_id, group_id, group_is_tag) VALUES (%s, %s, %s)"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_group WHERE song_id = %s AND group_id = %s"
	check_self_size_query = "SELECT COUNT(song_id) FROM r4_song_group JOIN r4_songs USING (song_id) WHERE group_id = %s AND song_verified = TRUE"
	delete_self_query = "DELETE FROM r4_groups WHERE group_id = %s"

	def _insert_into_db(self):
		self.id = db.c.get_next_id("r4_groups", "group_id")
		return db.c.update("INSERT INTO r4_groups (group_id, group_name) VALUES (%s, %s)", (self.id, self.data['name']))

	def _update_db(self):
		return db.c.update("UPDATE r4_groups SET group_name = %s WHERE group_id = %s", (self.name, self.id))

	def _start_cooldown_db(self, sid, cool_time):
		cool_end = int(cool_time + time.time())
		log.debug("cooldown", "Group ID %s Station ID %s cool_time period: %s" % (self.id, sid, cool_time))
		# Make sure to update both the if and else SQL statements if doing any updates
		if db.c.allows_join_on_update:
			db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s "
						"FROM r4_song_group "
						"WHERE r4_song_sid.song_id = r4_song_group.song_id AND r4_song_group.group_id = %s "
						"AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end <= %s",
						(cool_end, self.id, sid, time.time() - cool_time))
		else:
			song_ids = db.c.fetch_list(
				"SELECT song_id "
				"FROM r4_song_group JOIN r4_song_sid USING (song_id) "
				"WHERE r4_song_group.group_id = %s AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end < %s",
				(self.id, sid, time.time() - cool_time))
			for song_id in song_ids:
				db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND sid = %s", (cool_end, song_id, sid))

	def _start_election_block_db(self, sid, num_elections):
		if db.c.allows_join_on_update:
			# refer to song.set_election_block for base SQL
			db.c.update("UPDATE r4_song_sid "
						"SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s "
						"FROM r4_song_group "
						"WHERE r4_song_sid.song_id = r4_song_group.song_id AND "
						"r4_song_group.group_id = %s AND r4_song_sid.sid = %s AND song_elec_blocked_num < %s",
						('group', num_elections, self.id, sid, num_elections))
		else:
			table = db.c.fetch_all("SELECT r4_song_group.song_id FROM r4_song_group JOIN r4_song_sid ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) WHERE group_id = %s", (self.id, sid))
			for row in table:
				song = Song()
				song.id = row['song_id']
				song.set_election_block(sid, 'group', num_elections)
