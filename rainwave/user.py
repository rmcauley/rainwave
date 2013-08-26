import copy
import time
import re
import random
import string

from libs import log
from libs import cache
from libs import db
from libs import config

from rainwave import playlist

from api.exceptions import APIException

_AVATAR_PATH = "/forums/download/file.php?avatar=%s"

def trim_listeners(sid):
	db.c.update("DELETE FROM r4_listeners WHERE sid = %s AND listener_purge = TRUE", (sid,))
	
def unlock_listeners(sid):
	db.c.update("UPDATE r4_listeners SET listener_lock_counter = listener_lock_counter - 1 WHERE listener_lock = TRUE AND listener_lock_sid = %s", (sid,))
	db.c.update("UPDATE r4_listeners SET listener_lock = FALSE WHERE listener_lock_counter <= 0")

class User(object):
	def __init__(self, user_id):
		self.id = user_id
		self.authorized = False
		self.ip_address = False
		
		self.request_sid = 0
		self.api_key = False
		self.official_ui = False
		
		self.data = {}
		self.data['radio_admin'] = False
		self.data['radio_dj'] = False
		self.data['radio_tuned_in'] = False
		self.data['radio_perks'] = False
		self.data['radio_request_position'] = 0
		self.data['radio_request_expires_at'] = 0
		self.data['radio_rate_anything'] = False
		self.data['user_avatar'] = "images/blank.png"
		self.data['user_new_privmsg'] = 0
		self.data['radio_listen_key'] = None
		self.data['user_id'] = 1
		self.data['username'] = "Anonymous"
		self.data['sid'] = 0
		self.data['listener_lock'] = False
		self.data['listener_lock_in_effect'] = False
		self.data['listener_lock_sid'] = None
		self.data['listener_lock_counter'] = 0
		self.data['listener_voted_entry'] = 0
		self.data['listener_id'] = 0
		self.data['_group_id'] = None

	def authorize(self, sid, ip_address, api_key, bypass = False):
		self.request_sid = sid
		self.ip_address = ip_address
		self.api_key = api_key
				
		if not bypass and not re.match('^[\w\d]+$', api_key):
			return
		
		if self.id > 1:
			self._auth_registered_user(ip_address, api_key, bypass)
		else:
			self._auth_anon_user(ip_address, api_key, bypass)
		if self.authorized:
			self.refresh()
			
	def _get_all_api_keys(self):
		keys = db.c.fetch_list("SELECT api_key FROM r4_api_keys WHERE user_id = %s ", (self.id,))
		cache.set_user(self, "api_keys", keys)
		return keys
	
	def _auth_registered_user(self, ip_address, api_key, bypass = False):
		if not bypass:
			keys = cache.get_user(self, "api_keys")
			if not keys:
				if not api_key in self._get_all_api_keys():
					log.debug("auth", "Invalid user ID %s and/or API key %s." % (self.id, api_key))
					return
			if not api_key in keys:
				log.debug("auth", "Invalid user ID %s and/or API key %s from cache." % (self.id, api_key))
				return

		# Set as authorized and begin populating information
		# Pay attention to the "AS _variable" names in the SQL fields, they won't get exported to private JSONable dict
		self.authorized = True
		user_data = None
		if not user_data:
			user_data = db.c_old.fetch_row("SELECT user_id, username, user_new_privmsg, user_avatar, user_avatar_type AS _user_avatar_type, radio_listenkey AS radio_listen_key, group_id AS _group_id, radio_totalratings AS _total_ratings "
					"FROM phpbb_users WHERE user_id = %s",
					(self.id,))
		self.data.update(user_data)
			
		if self.data['_user_avatar_type'] == 1:
			self.data['user_avatar'] = _AVATAR_PATH % self.data['user_avatar']
		elif self.data['_user_avatar_type'] > 0:
			pass
		else:
			self.data['user_avatar'] = "images/blank.png"

		# Privileged folk - donors, admins, etc - get perks.
		# The numbers are the phpBB group IDs.
		if self.data['_group_id'] in [5, 4, 8, 12, 15, 14, 17]:
			self.data['radio_perks'] = True
		elif config.get("developer_mode"):
			self.data['radio_perks'] = True
		
		# Admin and station manager groups
		if self.data['_group_id'] in [5, 12, 15, 14, 17]:
			self.data['radio_admin'] = True
		# jfinalfunk is a special case since he floats around outside the main admin groups
		elif self.id == 9575:
			self.data['radio_admin'] = True
			
		if self.data['_total_ratings'] > config.get("rating_allow_all_threshold"):
			self.data['radio_rate_anything'] = True
			
		if not self.data['radio_listen_key']:
			self.generate_listen_key()

	def _auth_anon_user(self, ip_address, api_key, bypass = False):
		if not bypass:
			auth_against = cache.get("ip_%s_api_key" % ip_address)
			if not auth_against:
				auth_against = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE api_ip = %s AND user_id = 1", (ip_address,))
				if not auth_against:
					log.debug("user", "Anonymous user key %s not found." % api_key)
					return
				cache.set("ip_%s_api_key" % ip_address, auth_against)
			if auth_against != api_key:
				log.debug("user", "Anonymous user key %s does not match DB key %s." % (api_key, auth_against))
				return
		self.authorized = True
		
	def get_listener_record(self, use_cache=True):
		listener = None
		if self.id > 1 and use_cache:
			listener = cache.get_user(self.id, "listener_record")
		if self.id == 1 or not use_cache or not listener:
			listener = db.c.fetch_row("SELECT "
				"listener_id, sid, listener_lock, listener_lock_sid, listener_lock_counter, listener_voted_entry "
				"FROM r4_listeners "
				"WHERE user_id = %s AND listener_purge = FALSE", (self.id,))
		if listener:
			self.data.update(listener)
		if self.id > 1:
			cache.set_user(self.id, "listener_record", listener)
		return listener

	def refresh(self):
		listener = self.get_listener_record()
		if listener:
			if self.data['sid'] == self.request_sid:
				self.data['radio_tuned_in'] = True
			elif self.request_sid == 0:
				self.request_sid = self.data['sid']
				self.data['radio_tuned_in'] = True
			else:
				self.data['sid'] = self.request_sid
		# Default to All if no sid is given
		elif self.request_sid == 0:
			self.request_sid = 5
			self.data['sid'] = 5
			self.data['radio_tuned_in'] = False
		else:
			self.data['sid'] = self.request_sid
			self.data['radio_tuned_in'] = False
	
		if (self.id > 1) and cache.get_station(self.request_sid, "sched_current"):
			if cache.get_station(self.request_sid, "sched_current").get_dj_user_id() == self.id:
				self.data['radio_dj'] = True
			
			self.data['radio_request_position'] = self.get_request_line_position(self.data['sid'])
			self.data['radio_request_expires_at'] = self.get_request_expiry()
		
			if self.data['radio_tuned_in'] and not self.is_in_request_line() and self.has_requests():
				self.put_in_request_line(self.data['sid'])
		
		if self.data['listener_lock'] and self.request_sid != self.data['listener_lock_sid']:
			self.data['listener_lock_in_effect'] = True

	def to_private_dict(self):
		"""
		Returns a JSONable dict containing data that the user will want to see or make use of.
		NOT for other users to see.
		"""
		public = {}
		for k, v in self.data.iteritems():
			if k[0] != '_':
				public[k] = v
		return public
		
	def to_public_dict(self):
		"""
		Returns a JSONable dict containing data that other users are allowed to see.
		"""
		pass
		
	def is_tunedin(self):
		return self.data['radio_tuned_in']
		
	def is_admin(self):
		return self.data['radio_admin'] > 0 and self.official_ui
		
	def is_dj(self):
		return self.data['radio_dj'] > 0 and self.official_ui
	
	def has_perks(self):
		return self.data['radio_perks']
		
	def is_anonymous(self):
		return self.id <= 1
		
	def has_requests(self, sid = False):
		if self.id <= 1:
			return False
		elif sid:
			return db.c.fetch_var("SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s AND sid = %s", (sid, self.id))
		else:
			return db.c.fetch_var("SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s", (self.id,))
		
	def _check_too_many_requests(self):
		num_reqs = self.has_requests()
		max_reqs = 6
		if self.data['radio_perks']:
			max_reqs = 12
		if num_reqs >= max_reqs:
			raise APIException("too_many_requests")
		return num_reqs - max_reqs
		
	def add_request(self, sid, song_id):
		self._check_too_many_requests()
		song = playlist.Song.load_from_id(song_id, sid)
		for requested in self.get_requests():
			if song.id == requested['id']:
				raise APIException("same_request_exists")
			for album in song.albums:
				for requested_album in requested['albums']:
					if album.id == requested_album['id']:
						raise APIException("same_request_album")
		updated_rows = db.c.update("INSERT INTO r4_request_store (user_id, song_id) VALUES (%s, %s)", (self.id, song_id))
		if self.data['sid'] == sid and self.is_tunedin():
			self.put_in_request_line(sid)
		return updated_rows
	
	def add_unrated_requests(self, sid):
		limit = self._check_too_many_requests()
		added_songs = 0
		for song_id in playlist.get_unrated_songs_for_requesting(self.id, sid, limit):
			added_requests += self.add_request(sid, song_id)
		return added_requests
			
	def remove_request(self, song_id):
		song_requested = db.c.fetch_var("SELECT reqstor_id FROM r4_request_store WHERE user_id = %s AND song_id = %s", (self.id, song_id))
		if not song_requested:
			raise APIException("song_not_requested")
		return db.c.update("DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s", (self.id, song_id))
			
	def put_in_request_line(self, sid):
		if self.id <= 1:
			return False
		else:
			already_lined = db.c.fetch_row("SELECT * FROM r4_request_line WHERE user_id = %s", (self.id,))
			if already_lined and already_lined['sid'] == sid:
				if already_lined['line_expiry_tune_in']:
					db.c.update("UPDATE r4_request_line SET line_expiry_tune_in = NULL WHERE user_id = %s", (time.time(), listener['user_id']))
				return True
			elif already_lined:
				self.remove_from_request_line()
			return (db.c.update("INSERT INTO r4_request_line (user_id, sid) VALUES (%s, %s)", (self.id, sid)) > 0)
			
	def remove_from_request_line(self):
		return (db.c.update("DELETE FROM r4_request_line WHERE user_id = %s", (self.id,)) > 0)
		
	def is_in_request_line(self):
		return (db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s", (self.id,)) > 0)
		
	def get_top_request_song_id(self, sid):
		return db.c.fetch_var("SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE ORDER BY reqstor_order, reqstor_id", (self.id, sid))
		
	def get_top_request_sid(self):
		return db.c.fetch_var("SELECT reqstor_id FROM r4_request_store WHERE user_id = %s ORDER BY reqstor_order, reqstor_id LIMIT 1", (self.id,))
		
	def get_request_line_position(self, sid):
		if self.id <= 1:
			return None
		if self.id in cache.get_station(sid, "request_user_positions"):
			return cache.get_station(sid, "request_user_positions")[self.id]
		return None
						
	def get_request_expiry(self):
		if self.id <= 1:
			return None
		if self.id in cache.get("request_expire_times"):
			return cache.get("request_expire_times")[self.id]
		return None
			
	def get_requests(self):
		if self.id <= 1:
			return []
		requests = cache.get_user(self, "requests")
		if not requests:
			requests = db.c.fetch_all(
				"SELECT r4_request_store.song_id AS id, r4_request_store.reqstor_order AS order, r4_request_store.reqstor_id AS request_id, "
					"song_origin_sid AS origin_sid, song_rating AS rating, song_title AS title, "
					"COALESCE(r4_song_sid.album_id, album_data.album_id) AS album_id, album_name, "
					"song_length AS length, r4_song_sid.song_cool AS cool, r4_song_sid.song_cool_end AS cool_end, r4_song_sid.song_exists AS valid, "
					"r4_song_sid.song_elec_blocked AS elec_blocked, r4_song_sid.song_elec_blocked_by AS elec_blocked_by, "
					"r4_song_sid.song_elec_blocked_num AS elec_blocked_num, r4_song_sid.song_exists AS requestable "
				"FROM r4_request_store "
					"JOIN r4_songs USING (song_id) "
					"JOIN r4_song_sid AS album_data USING (song_id) "
					"LEFT JOIN r4_song_sid ON (r4_song_sid.sid = 1 AND r4_songs.song_id = r4_song_sid.song_id) "
					"LEFT JOIN r4_song_ratings ON (r4_song_sid.sid = 1 AND r4_songs.song_id = r4_song_sid.song_id) "
					"JOIN r4_albums ON (r4_song_sid.album_id = r4_albums.album_id OR album_data.album_id = r4_albums.album_id) "
				"WHERE r4_request_store.user_id = 1 "
				"ORDER BY reqstor_order, reqstor_id",
				(self.request_sid, self.id))
			if not requests:
				requests = []
			for song in requests:
				song['albums'] = [ { "name": song['album_name'], "id": song['album_id'] } ]
				song.pop('album_name', None)
				song.pop('album_id', None)
			cache.set_user(self, "requests", requests)
		return requests
	
	def set_request_tunein_expiry(self, t = None):
		if not self.is_in_request_line():
			return None
		if not t:
			t = time.time() + config.get("request_tunein_timeout")
		return db.c.update("UPDATE r4_listeners SET line_expiry_tunein = %s WHERE user_id = %s", (t, self.id))

	def lock_to_sid(self, sid, lock_count):
		self.data['listener_lock'] = True
		self.data['listener_lock_sid'] = sid
		self.data['listener_lock_counter'] = lock_count
		return db.c.update("UPDATE r4_listeners SET listener_lock = TRUE, listener_lock_sid = %s, listener_lock_counter = %s WHERE listener_id = %s", (sid, lock_count, self.data['listener_id']))
		
	def update(self, hash):
		self.data.update(hash)

	def generate_listen_key(self):
		listen_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(10))
		db.c_old.update("UPDATE phpbb_users SET radio_listenkey = %s WHERE user_id = %s", (listen_key, self.id))
		self.update({ "radio_listen_key": listen_key })

	def ensure_api_key(self, ip_address = None):
		if self.id == 1 and ip_address:
			api_key = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE user_id = 1 AND api_ip = %s", (ip_address,))
			if not api_key:
				api_key = self.generate_api_key(ip_address, int(time.time()) + 86400)
		elif self.id > 1:
			api_key = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE user_id = %s", (self.id,))
			if not api_key:
				api_key = self.generate_api_key()
		# DO NOT USE self.update, we don't want this value in memcache or it'll get sucked into future request (which could expose it to other clients)
		self.data['api_key'] = api_key

	def generate_api_key(self, ip_address = None, expiry = None):
		# TODO: Delete expired anonymous API keys
		api_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(10))
		db.c.update("INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_ip) VALUES (%s, %s, %s, %s)", (self.id, api_key, expiry, ip_address))
		# this function updates the API key cache for us
		self._get_all_api_keys()
		return api_key
