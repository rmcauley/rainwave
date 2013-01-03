import os
import time
import random
import math
import subprocess

from mutagen.mp3 import MP3

from libs import db
from libs import config
from libs import log

cooldown_config = { }

# TODO: Favourites!
# TODO: Song ranks?
# TODO: User rating...?

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
	sum_aasl = db.c.fetch_var("SELECT SUM(aasl) FROM (SELECT AVG(song_length) AS aasl FROM r4_album_sid JOIN r4_song_album USING (album_id) JOIN r4_songs USING (song_id) WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS jfiscrazy", (sid,))
	if not sum_aasl:
		sum_aasl = 100
	# print "sumAASL: %s" % sum_aasl
	avg_album_rating = db.c.fetch_var("SELECT AVG(album_rating) FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE", (sid,)) 
	if not avg_album_rating:
		avg_album_rating = 3.5
	# print "avg_album_rating: %s" % avg_album_rating
	multiplier_adjustment = db.c.fetch_var("SELECT SUM(tempvar) FROM (SELECT r4_album_sid.album_id, AVG(album_cool_multiply) * AVG(song_length) AS tempvar FROM r4_album_sid JOIN r4_song_album USING (album_id) JOIN r4_songs USING (song_id) WHERE r4_album_sid.sid = %s AND r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS hooooboy", (sid,))
	if not multiplier_adjustment:
		multiplier_adjustment = 1
	# print "multi: %s" % multiplier_adjustment
	base_album_cool = float(config.get_station(sid, "cooldown_percentage")) * float(sum_aasl) / float(multiplier_adjustment)
	# print "base_album_cool: %s" % base_album_cool
	base_rating = db.c.fetch_var("SELECT SUM(tempvar) FROM (SELECT r4_album_sid.album_id, AVG(album_rating) * AVG(song_length) AS tempvar FROM r4_albums JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_album_sid.sid = %s) JOIN r4_song_album ON (r4_albums.album_id = r4_song_album.album_id) JOIN r4_songs USING (song_id) WHERE r4_songs.song_verified = TRUE GROUP BY r4_album_sid.album_id) AS hooooboy", (sid,))
	if not base_rating:
		base_rating = 4
	# print "base rating: %s" % base_rating
	min_album_cool = config.get_station(sid, "cooldown_highest_rating_multiplier") * base_album_cool
	# print "min_album_cool: %s" % min_album_cool
	max_album_cool = min_album_cool + ((5 - 2.5) * ((base_album_cool - min_album_cool) / (5 - base_rating)))
	# print "max_album_cool: %s" % max_album_cool
	
	cooldown_config[sid]['sum_aasl'] = sum_aasl
	cooldown_config[sid]['avg_album_rating'] = avg_album_rating
	cooldown_config[sid]['multiplier_adjustment'] = multiplier_adjustment
	cooldown_config[sid]['base_album_cool'] = base_album_cool
	cooldown_config[sid]['base_rating'] = base_rating
	cooldown_config[sid]['min_album_cool'] = min_album_cool
	cooldown_config[sid]['max_album_cool'] = max_album_cool
	cooldown_config[sid]['time'] = time.time()
	
	average_song_length = db.c.fetch_var("SELECT AVG(song_length) FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_exists = TRUE AND sid = %s", (sid,))
	# print "average_song_length: %s" % average_song_length
	if not average_song_length:
		average_song_length = 160
	number_songs = db.c.fetch_var("SELECT COUNT(song_id) FROM r4_song_sid WHERE song_exists = TRUE AND sid = %s", (sid,))
	if not number_songs:
		number_songs = 1
	# print "number_songs: %s" % number_songs
	cooldown_config[sid]['max_song_cool'] = float(average_song_length) * (number_songs * config.get_station(sid, "cooldown_song_max_multiplier"))
	cooldown_config[sid]['min_song_cool'] = cooldown_config[sid]['max_song_cool'] * config.get_station(sid, "cooldown_song_min_multiplier")
	
def get_age_cooldown_multiplier(added_on):
	age_weeks = (time.time() - added_on) / 604800.0
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
	
def get_random_song_timed(sid, target_seconds, target_delta = 30):
	"""
	Fetch a random song abiding by all election block, request block, and
	availability rules, but giving priority to the target song length 
	provided.  Falls back to get_random_ignore_requests on failure.
	"""
	sql_query = "FROM r4_songs JOIN r4_song_sid JOIN r4_song_album USING (song_id) JOIN r4_album_sid USING (album_id) \
		WHERE r4_song_sid.sid = %s AND r4_album_sid.sid = %s AND song_cool = FALSE AND song_elec_blocked = FALSE AND album_request_count = 0 AND song_request_only = FALSE AND song_length >= %s AND song_length <= %s"
	num_available = db.c.fetch_var("SELECT COUNT(r4_song_sid.song_id) " + sql_query, (sid, sid, (target_seconds - target_delta), (target_seconds + target_delta)))
	if num_available == 0:
		return get_random_song(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT r4_song_sid.song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, sid, (target_seconds - target_delta), (target_seconds + target_delta), offset))
		return Song.load_from_id(song_id, sid)
	
def get_random_song(sid, target_seconds = None, target_delta = None):
	"""
	Fetch a random song, abiding by all election block, request block, and
	availability rules.  Falls back to get_random_ignore_requests on failure.
	"""
	if target_seconds:
		if target_delta:
			get_random_song_timed(sid, target_seconds, target_delta)
		else:
			get_random_song_timed(sid, target_seconds)

	sql_query = "FROM r4_song_sid JOIN r4_song_album USING (song_id) JOIN r4_album_sid USING (album_id) \
		WHERE r4_song_sid.sid = %s AND r4_album_sid.sid = %s AND song_cool = FALSE AND song_request_only = FALSE AND song_elec_blocked = FALSE AND album_request_count = 0"
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid, sid))
	offset = 0
	if num_available == 0:
		return get_random_song_ignore_requests(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, sid, offset))
		return Song.load_from_id(song_id, sid)
	
def get_random_song_ignore_requests(sid):
	"""
	Fetch a random song abiding by election block and availability rules,
	but ignoring request blocking rules.
	"""
	sql_query = "FROM r4_song_sid WHERE r4_song_sid.sid = %s AND song_cool = FALSE AND song_elec_blocked = FALSE AND song_request_only = FALSE"
	num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
	offset = 0
	if num_available == 0:
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
		return get_random_song_ignore_all(sid)
	else:
		offset = random.randint(1, num_available) - 1
		song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset))
		return Song.load_from_id(song_id, sid)
	
def warm_cooled_songs(sid):
	"""
	Makes songs whose cooldowns have expired available again.
	"""
	db.c.update("UPDATE r4_song_sid SET song_cool = FALSE WHERE sid = %s AND song_cool_end < %s AND song_cool = TRUE", (sid, time.time()))
	
def remove_all_locks(sid):
	"""
	Removes all cooldown & election locks on songs.
	"""
	db.c.update("UPDATE r4_song_sid SET song_elec_blocked = FALSE, song_elec_blocked_num = 0, song_cool = FALSE, song_cool_end = 0 WHERE sid = %s", (sid,))
	
def get_all_albums_list(sid, user):
	return db.c.fetch_all(
		"SELECT album_id, album_name, album_rating, album_cool_lowest, album_fave, album_user_rating "
		"FROM r4_albums "
		"JOIN r4_album_sid USING (album_id) "
		"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s) "
		"WHERE r4_album_sid.sid = %s "
		"ORDER BY album_name",
		(user.id, user.id, sid))
		
def get_all_artists_list(sid):
	return db.fetch_all(
		"SELECT artist_name, artist_id "
		"FROM r4_artists JOIN r4_song_artist USING (artist_id) JOIN r4_song_sid using (song_id) "
		"WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
		"GROUP BY artist_id, artist_name "
		"ORDER BY artist_name",
		(user.sid,))
	
class SongHasNoSIDsException(Exception):
	pass

class SongNonExistent(Exception):
	pass
	
class SongMetadataUnremovable(Exception):
	pass
	
class Song(object):
	@classmethod
	def load_from_id(klass, id, sid = None):
		d = None
		if not sid:
			d = db.c.fetch_row("SELECT * FROM r4_songs WHERE song_id = %s", (id,))
		else:
			d = db.c.fetch_row("SELECT * FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.song_id = %s AND r4_song_sid.sid = %s", (id, sid))
		if not d:
			raise SongNonExistent
		
		s = klass()
		s.id = id
		s.filename = d['song_filename']
		s.verified = d['song_verified']
		s.data['sids'] = db.c.fetch_list("SELECT sid FROM r4_song_sid WHERE song_id = %s", (id,))
		s.data['title'] = d['song_title']
		s.data['link'] = d['song_link']
		s.data['link_text'] = d['song_link_text']
		s.data['length'] = d['song_length']
		s.data['added_on'] = d['song_added_on']
		s.data['rating'] = d['song_rating']
		s.data['rating_count'] = d['song_rating_count']
		s.data['cool_multiply'] = d['song_cool_multiply']
		s.data['cool_override'] = d['song_cool_override']
		s.data['origin_sid'] = d['song_origin_sid']
		s.data['sid'] = sid
		# TODO: fill in rank somehow/somewhere (but not as part of this, too heavy an SQL statement)
		s.data['rank'] = None
		
		if sid:
			s.sid = sid
			s.data['cool'] = d['song_cool']
			s.data['cool_end'] = d['song_cool_end']
			s.data['elec_appearances'] = d['song_elec_appearances']
			s.data['elec_last'] = d['song_elec_last']
			s.data['elec_blocked'] = d['song_elec_blocked']
			s.data['elec_blocked_num'] = d['song_elec_blocked_num']
			s.data['elec_blocked_by'] = d['song_elec_blocked_by']
			s.data['vote_share'] = d['song_vote_share']
			s.data['vote_total'] = d['song_vote_total']
			s.data['request_total'] = d['song_request_total']
			s.data['played_last'] = d['song_played_last']
			s.albums = Album.load_list_from_song_id_sid(id, sid)
		else:
			s.albums = Album.load_list_from_song_id(id)

		s.artists = Artist.load_list_from_song_id(id)
		s.groups = SongGroup.load_list_from_song_id(id)
		
		return s
			
	@classmethod
	def load_from_file(klass, filename, sids):
		"""
		Produces an instance of the Song class with all album, group, and artist IDs loaded from only a filename.
		All metadata is saved to the database and updated where necessary.
		"""

		kept_albums = []
		kept_artists = []
		kept_groups = []
		matched_entry = db.c.fetch_row("SELECT song_id FROM r4_songs WHERE song_filename = %s", (filename,))
		if matched_entry:
			s = klass.load_from_id(matched_entry['song_id'])
			for metadata in s.albums:
				if metadata.is_tag:
					metadata.disassociate_song_id(s.id)
				else:
					kept_albums.append(metadata)
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
		new_albums = Album.load_list_from_tag(s.album_tag)
		new_groups = SongGroup.load_list_from_tag(s.genre_tag)
		
		for metadata in new_artists + new_groups:
			metadata.associate_song_id(s.id)
			
		s.artists = new_artists + kept_artists
		s.albums = new_albums + kept_albums
		s.groups = new_groups + kept_groups
		
		for metadata in s.albums:
			metadata.associate_song_id(s.id, sids)
		
		return s
		
	@classmethod
	def create_fake(klass, sid):
		if not config.test_mode:
			raise "Tried to create a fake song when not in test mode."
			
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
		if not "TXXX:REPLAYGAIN_TRACK_GAIN" in keys:
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
		elif len(self.sids) == 0:
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
			self.verified = True
		else:
			self.id = db.c.get_next_id("r4_songs", "song_id")
			db.c.update("INSERT INTO r4_songs \
				(song_id, song_filename, song_title, song_link, song_link_text, song_length, song_origin_sid, song_file_mtime) \
				VALUES \
				(%s,      %s           , %s        , %s       , %s            , %s         , %s             , %s )",
				(self.id, self.filename, self.data['title'], self.data['link'], self.data['link_text'], self.data['length'], self.data['origin_sid'], file_mtime))
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
		self.data['added_on'] = d['song_added_on']
		self.data['rating'] = d['song_rating']
		self.data['rating_count'] = d['song_rating_count']
		self.data['cool_multiply'] = d['song_cool_multiply']
		self.data['cool_override'] = d['song_cool_override']
	
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
			if not self.data['rating'] or self.data['rating'] == 0:
				cool_rating = 4
			# 3.5 is the rating range (2.5 to 5.0) and 2.5 is the "minimum" rating, effectively.
			auto_cool = ((3.5 - (cool_rating - 2.5)) / 3.5) * cooldown_config[sid]['max_song_cool'] + cooldown_config[sid]['min_song_cool']
			cool_time = auto_cool * get_age_cooldown_multiplier(self.data['added_on']) * self.data['cool_multiply']
			
		cool_time = int(cool_time + time.time())
		db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND sid = %s", (cool_time, self.id, sid))
		self.data['cool'] = True
		self.data['cool_end'] = cool_time

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
		# The above won't actually modify the data in THIS class, so to present things nicely for the API
		# we'll need to modify this here manually. (no need to touch the DB)
		self.data['elec_blocked_num'] = num_elections
		self.data['elec_blocked_by'] = "in_election"
		self.data['elec_blocked'] = True
			
	def set_election_block(self, sid, blocked_by, block_length):
		db.c.update("UPDATE r4_song_sid SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s WHERE song_id = %s AND sid = %s AND song_elec_blocked_num < %s", (blocked_by, block_length, self.id, sid, block_length))
		self.data['elec_blocked_num'] = block_length
		self.data['elec_blocked_by'] = blocked_by
		self.data['elec_blocked'] = True
	
	def update_rating(self):
		"""
		Calculate an updated rating from the database.
		"""
		dislikes = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_user_rating < 3 GROUP BY song_id", (self.id,))
		neutrals = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_user_rating >= 3 AND song_user_rating < 3.5 GROUP BY song_id", (self.id,));
		neutralplus = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_user_rating >= 3.5 AND song_user_rating < 4 GROUP BY song_id", (self.id,));
		likes = db.c.fetch_var("SELECT COUNT(*) FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s AND song_user_rating >= 4 GROUP BY song_id", (self.id,));
		rating_count = dislikes + neutrals + neutralplus + likes
		if rating_count > config.get("rating_threshold_for_calc"):
			self.rating = round(((((likes + (neutrals * 0.5) + (neutralplus * 0.75)) / (likes + dislikes + neutrals + neutralplus) * 4.0)) + 1), 1)
			db.c.update("UPDATE r4_songs SET song_rating = %s, song_rating_count = %s WHERE song_id = %s", (self.rating, rating_count, self.id))
		
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
		
	def remove_artist_id(self, id):
		return self._remove_metadata_id(self.artists, id)
		
	def remove_album_id(self, id):
		return self._remove_metadata_id(self.albums, id)
		
	def remove_group_id(self, id):
		return self._remove_metadata_id(self.groups, id)
		
	def _remove_metadata_id(self, lst, id):
		for metadata in lst:
			if metadata.id == id and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by ID %s that wasn't assigned by ID3." % id)
		
	def remove_artist(self, name):
		return self._remove_metadata(self.artists, name)
		
	def remove_album(self, name):
		return self._remove_metadata(self.albums, name)
		
	def remove_group(self, name):
		return self._remove_metadata(self.groups, name)
		
	def _remove_metadata(self, lst, name):
		for metadata in lst:
			if metadata.data['name'] == name and not metadata.is_tag:
				metadata.disassociate_song_id(self.id)
				return True
		raise SongMetadataUnremovable("Found no tag by name %s that wasn't assigned by ID3." % name)
		
	def to_dict(self, user = None):
		self.data['id'] = self.id
		album_list = []
		artist_list = []
		group_list = []
		if self.albums:
			for metadata in self.albums:
				album_list.append(metadata.to_dict(user))
			self.data['albums'] = album_list
		if self.artists:
			for metadata in self.artists:
				artist_list.append(metadata.to_dict(user))
			self.data['artists'] = artist_list
		if self.groups:
			for metadata in self.groups:
				group_list.append(metadata.to_dict(user))
			self.data['groups'] = group_list
		if user:
			# TODO: ratings
			self.data['user_rating'] = None
			self.data['fave'] = False
		else:
			self.data['user_rating'] = None
			self.data['fave'] = False
		return self.data
		
	def get_all_ratings(self):
		table = db.c.fetch_all("SELECT song_user_rating, song_fave, user_id FROM r4_song_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND song_id = %s", (self.id,))
		all_ratings = {}
		for row in all_ratings:
			all_ratings[row['user_id']] = { 'song_rating': row['song_user_rating'], 'song_fave': row['song_fave'] }
		return all_ratings
		
	def update_last_played(self, sid):
		for album in self.albums:
			album.update_last_played(sid)
		return db.c.update("UPDATE r4_song_sid SET song_played_last = %s WHERE song_id = %s AND sid = %s", (time.time(), self.id, sid))
		
	def add_to_vote_count(self, votes, sid):
		return db.c.update("UPDATE r4_song_sid SET song_vote_total = song_vote_total + %s WHERE song_id = %s AND sid = %s", (votes, self.id, sid))
		
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
	def load_from_id(klass, id):
		instance = klass()
		data = db.c.fetch_row(klass.select_by_id_query, (id,))
		if not data:
			raise MetadataNotFoundError("%s ID %s could not be found." % (klass.__name__, id))
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
		self.elec_block = False
		self.cool_time = False
		
		self.data = {}
		self.data['name'] = None

	def _assign_from_dict(self, d):
		self.id = d["id"]
		self.data['name'] = d["name"]
		if d.has_key("is_tag"):
			self.is_tag = d["is_tag"]
		if d.has_key("elec_block"):
			self.elec_block = d["elec_block"]
		if d.has_key("cool_time"):
			self.cool_time = d["cool_time"]
		
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
		if num_elections:
			self._start_election_block_db(sid, num_elections)
		elif self.elec_block:
			self._start_election_block_db(sid, self.elec_block)
		
	def start_cooldown(self, sid, cool_time = False):
		if cool_time:
			self._start_cooldown_db(sid, cool_time)
		elif self.cool_time:
			self._start_cooldown_db(sid, self.cool_time)

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
	album_diff = []
	for album_id in updated_album_ids[sid]:
		album = Album.load_from_id_sid(album_id, sid)
		album.solve_cool_lowest(sid)
		album_diff.append(album.to_dict())
	# TODO: Return newly added albums here (query new albums since last time this function was run)
	return album_diff
		
class Album(AssociatedMetadata):
	select_by_name_query = "SELECT r4_albums.* FROM r4_albums WHERE album_name = %s"
	select_by_id_query = "SELECT r4_albums.* FROM r4_albums WHERE album_id = %s"
	select_by_song_id_query = "SELECT r4_albums.*, r4_song_album.album_is_tag FROM r4_song_album JOIN r4_albums USING (album_id) WHERE song_id = %s ORDER BY r4_albums.album_name"
	disassociate_song_id_query = "DELETE FROM r4_song_album WHERE song_id = %s AND album_id = %s"
	has_song_id_query = "SELECT COUNT(song_id) FROM r4_song_album WHERE song_id = %s AND album_id = %s"
	# This is a hack, but,umm..... yeah.  It'll do. :P  reconcile_sids handles these duties.
	check_self_size_query = "SELECT 1, %s"
	# delete_self_query will never run, but just in case
	delete_self_query = "SELECT 1, %s"
	
	@classmethod
	def load_list_from_song_id_sid(klass, song_id, sid):
		instances = []
		for row in db.c.fetch_all("SELECT r4_albums.*, r4_song_album.album_is_tag, album_cool_lowest, album_cool_multiply, album_cool_override FROM r4_song_album JOIN r4_albums USING (album_id) JOIN r4_album_sid USING (album_id) WHERE song_id = %s  AND r4_song_album.sid = %s AND r4_album_sid.sid = %s ORDER BY r4_albums.album_name", (song_id, sid, sid)):
			instance = klass()
			instance._assign_from_dict(row)
			instance.sids = [ sid ]
			instances.append(instance)
		return instances
		
	@classmethod
	def load_from_id_sid(cls, album_id, sid):
		row = db.c.fetch_row("SELECT r4_albums.*, album_cool_lowest, album_cool_multiply, album_cool_override FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s", (album_id, sid))
		if not row:
			return None
		instance = cls()
		instance._assign_from_dict(row)
		instance.sids = [ sid ]
		return instance
		
	def __init__(self):
		super(Album, self).__init__()
		self.sids = []

	def _insert_into_db(self):
		global updated_album_ids
	
		self.id = db.c.get_next_id("r4_albums", "album_id")
		success = db.c.update("INSERT INTO r4_albums (album_id, album_name) VALUES (%s, %s)", (self.id, self.data['name']))
		for sid in self.sids:
			updated_album_ids[sid][self.id] = True
		return success
	
	def _update_db(self):
		global updated_album_ids
		
		success = db.c.update("UPDATE r4_albums SET album_name = %s, album_rating = %s WHERE album_id = %s", (self.data['name'], self.data['rating'], self.id))
		for sid in self.sids:
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
		self._dict_check_assign(d, "album_request_total", 0)
		if d.has_key('album_is_tag'):
			self.is_tag = d['album_is_tag']
		if os.path.isfile(os.path.join(config.get("album_art_file_path"), "%s.jpg" % self.id)):
			self.data['album_art'] = config.get("album_art_url_path") + "/" + str(self.id)
		else:
			self.data['album_art'] = None
		# TODO: fill in rank on the album API request
		self.data['rank'] = None
			
	def _dict_check_assign(self, d, key, default = None, new_key = None):
		if not new_key:
			# wild guess that we're removing "album_"
			new_key = key[6:]
		if d.has_key(key):
			self.data[new_key] = d[key]
		else:
			self.data[new_key] = default
	
	def associate_song_id(self, song_id, sids, is_tag = None):
		if is_tag == None:
			is_tag = self.is_tag
		else:
			self.is_tag = is_tag
		if db.c.fetch_var(self.has_song_id_query, (song_id, self.id)) > 0:
			pass
		else:
			associate_song_id_query = "INSERT INTO r4_song_album (song_id, album_id, album_is_tag, sid) VALUES (%s, %s, %s, %s)"
			for sid in sids:
				db.c.update(associate_song_id_query, (song_id, self.id, is_tag, sid))
		self.reconcile_sids()
		
	def disassociate_song_id(self, song_id):
		super(Album, self).disassociate_song_id(song_id)
		self.reconcile_sids()
		
	def reconcile_sids(self):
		new_sids = db.c.fetch_list("SELECT r4_song_album.sid FROM r4_song_album JOIN r4_song_sid USING (song_id) WHERE r4_song_album.album_id = %s AND r4_song_sid.song_exists = TRUE GROUP BY r4_song_album.sid", (self.id,))
		current_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE", (self.id,))
		old_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = FALSE", (self.id,))
		for sid in current_sids:
			if not new_sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = FALSE WHERE album_id = %s AND sid = %s", (self.id, sid))
		for sid in new_sids:
			if current_sids.count(sid):
				pass
			elif old_sids.count(sid):
				db.c.update("UPDATE r4_album_sid SET album_exists = TRUE WHERE album_id = %s AND sid = %s", (self.id, sid))
			else:
				db.c.update("INSERT INTO r4_album_sid (album_id, sid) VALUES (%s, %s)", (self.id, sid))
		self.sids = new_sids
		for sid in self.sids:
			updated_album_ids[sid][self.id] = True
				
	def start_cooldown(self, sid, cool_time = False):
		global cooldown_config

		if cool_time:
			pass
		elif self.data['cool_override']:
			self._start_cooldown_db(sid, self.data['cool_override'])
		else:
			auto_cool = cooldown_config[sid]['min_album_cool'] + ((self.data['rating'] - 2.5) * (cooldown_config[sid]['max_album_cool'] - cooldown_config[sid]['min_album_cool']))
			album_num_songs = db.c.fetch_var("SELECT COUNT(r4_song_album.song_id) FROM r4_song_album JOIN r4_song_sid USING (song_id) WHERE r4_song_album.album_id = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.sid = %s", (self.id, sid))
			cool_size_multiplier = config.get_station(sid, "cooldown_size_min_multiplier") + (config.get_station(sid, "cooldown_size_max_multiplier") - config.get_station(sid, "cooldown_size_min_multiplier")) / (1 + math.pow(2.7183, (config.get_station(sid, "cooldown_size_slope") * (album_num_songs - config.get_station(sid, "cooldown_size_slope_start")))) / 2);
			cool_time = auto_cool * cool_size_multiplier * get_age_cooldown_multiplier(self.data['added_on']) * self.data['cool_multiply']
		updated_album_ids[sid][self.id] = True
		return self._start_cooldown_db(sid, cool_time)
		
	def _start_cooldown_db(self, sid, cool_time):
		cool_end = int(cool_time + time.time())
		# SQLITE_CANNOT_DO_JOINS_ON_UPDATES
		songs = db.c.fetch_list("SELECT song_id FROM r4_song_album JOIN r4_song_sid USING (song_id) WHERE album_id = %s AND r4_song_sid.sid = %s AND r4_song_album.sid = %s AND song_exists = TRUE", (self.id, sid, sid))
		for song_id in songs:
			db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND song_cool_end < %s AND sid = %s", (cool_end, song_id, cool_end, sid))
			
	def solve_cool_lowest(self, sid):
		self.data['cool_lowest'] = db.c.fetch_var("SELECT MIN(song_cool_end) FROM r4_song_album JOIN r4_song_sid USING (song_id) WHERE r4_song_album.album_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE", (self.id, sid))
		db.c.update("UPDATE r4_album_sid SET album_cool_lowest = %s WHERE album_id = %s AND sid = %s", (self.data['cool_lowest'], self.id, sid))
		return self.data['cool_lowest']
		
	def update_rating(self):
		dislikes = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_user_rating < 3 GROUP BY album_id", (self.id,))
		neutrals = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_user_rating >= 3 AND album_user_rating < 3.5 GROUP BY album_id", (self.id,));
		neutralplus = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_user_rating >= 3.5 AND album_user_rating < 4 GROUP BY album_id", (self.id,));
		likes = db.c.fetch_var("SELECT COUNT(*) FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s AND album_rating >= 4 GROUP BY song_id", (self.id,));
		rating_count = dislikes + neutrals + neutralplus + likes
		if rating_count > config.get("rating_threshold_for_calc"):
			self.rating = round(((((likes + (neutrals * 0.5) + (neutralplus * 0.75)) / (likes + dislikes + neutrals + neutralplus) * 4.0)) + 1), 1)
			db.c.update("UPDATE r4_albums SET album_rating = %s, album_rating_count = %s WHERE album_id = %s", (self.rating, rating_count, self.id))
			
	def update_last_played(self, sid):
		return db.c.update("UPDATE r4_album_sid SET album_played_last = %s WHERE album_id = %s AND sid = %s", (time.time(), self.id, sid))
		
	def update_vote_total(self, sid):
		vote_total = db.c.fetch_var("SELECT SUM(song_vote_total) FROM r4_song_sid JOIN r4_song_album USING (song_id) WHERE album_id = %s AND song_exists = TRUE", (self.id,))
		return db.c.update("UPDATE r4_album_sid SET album_vote_total = %s WHERE album_id = %s AND sid = %s", (vote_total, self.id, sid))
		
	def get_all_ratings(self):
		table = db.c.fetch_all("SELECT album_user_rating, album_fave, user_id FROM r4_album_ratings JOIN phpbb_users USING (user_id) WHERE radio_inactive = FALSE AND album_id = %s", (self.id,))
		all_ratings = {}
		for row in table:
			all_ratings[row['user_id']] = { 'album_rating': row['album_user_rating'], 'album_fave': row['album_fave'] }
		return all_ratings
		
	def _start_election_block_db(self, sid, num_elections):
		table = db.c.fetch_all("SELECT song_id FROM r4_song_album WHERE album_id = %s AND sid = %s", (self.id, num_elections))
		for row in table:
			song = Song()
			song.id = row['song_id']
			song.set_election_block(sid, 'album', num_elections)
			
	def to_dict(self, user = None):
		d = super(Album, self).to_dict(user)
		if user:
			# TODO: album ratings
			self.data['user_rating'] = None
			self.data['fave'] = False
		else:
			d['user_rating'] = None
			d['fave'] = False
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
	
class SongGroup(AssociatedMetadata):
	select_by_name_query = "SELECT group_id AS id, group_name AS name FROM r4_groups WHERE group_name = %s"
	select_by_id_query = "SELECT group_id AS id, group_name AS name FROM r4_groups WHERE group_id = %s"
	select_by_song_id_query = "SELECT r4_groups.group_id AS id, r4_groups.group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s"
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
		cool_end = cool_time + time.time()
		# SQLITE_CANNOT_DO_JOINS_ON_UPDATES
		song_ids = db.c.fetch_list(
			"SELECT song_id "
			"FROM r4_song_group JOIN r4_song_sid USING (song_id) "
			"WHERE r4_song_group.group_id = %s AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE AND r4_song_sid.song_cool_end < %s",
			(self.id, sid, time.time() - cool_time))
		for song_id in song_ids:
			db.c.update("UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE song_id = %s AND sid = %s", (cool_end, song_id, sid))
			
	def _start_election_block_db(self, sid, num_elections):
		table = db.c.fetch_all("SELECT r4_song_group.song_id FROM r4_song_group JOIN r4_song_sid ON (r4_song_group.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) WHERE group_id = %s", (self.id, num_elections))
		for row in table:
			song = Song()
			song.id = row['song_id']
			song.set_election_block(sid, 'album', num_elections)
