import copy
import time
import re
import random
import string

from libs import log
from libs import cache
from libs import db

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
		self.data['user_avatar'] = "images/blank.png"
		self.data['user_new_privmsg'] = 0
		self.data['radio_listen_key'] = None
		self.data['user_id'] = 1
		self.data['username'] = "Anonymous"
		self.data['sid'] = 0
		self.data['listener_lock'] = False
		self.data['listener_lock_sid'] = None
		self.data['listener_lock_counter'] = 0
		self.data['listener_voted_entry'] = 0
		self.data['listener_id'] = 0

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

	def _auth_registered_user(self, ip_address, api_key, bypass = False):
		if not bypass:
			# TODO: Users can have multiple keys, should we cache them all?
			key = cache.get_user(self, "api_key")
			if not key:
				key = db.c.fetch_row("SELECT api_key, api_is_rainwave FROM r4_api_keys WHERE user_id = %s AND api_key = %s", (self.id, api_key))
				if not key:
					log.debug("auth", "Invalid user ID %s and/or API key %s." % (self.id, api_key))
					return
				cache.set_user(self, "api_key", key)
			if key['api_key'] != api_key:
				log.debug("auth", "Invalid user ID %s and/or API key %s from cache." % (self.id, api_key))
				return
			if key['api_is_rainwave']:
				self._official_ui = True

		# Set as authorized and begin populating information
		# Pay attention to the "AS _variable" names in the SQL fields, they won't get exported to private JSONable dict
		self.authorized = True
		user_data = cache.get_user(self, "db_data")
		if not user_data:
			user_data = db.c.fetch_row("SELECT user_id, username, user_new_privmsg, user_avatar, user_avatar_type AS _user_avatar_type, radio_listen_key, group_id AS _group_id "
					"FROM phpbb_users WHERE user_id = %s",
					(self.id,))
			cache.set_user(self, "db_data", user_data)
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
		
		# Admin and station manager groups
		if self.data['_group_id'] in [5, 12, 15, 14, 17]:
			self.data['radio_admin'] = True
		# jfinalfunk is a special case since he floats around outside the main admin groups
		elif self.id == 9575:
			self.data['radio_admin'] = True
			
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

	def refresh(self):
		#listener = None
		# if self.id in cache.get("listeners_internal"):
		# listener = cache.get("listeners_internal")[self.id]
		# else:
		# TODO: listeners_internal needs kind of a per-row updating, it may not be worth caching or it may be difficult to cache
		# considering it needs consistency
		listener = db.c.fetch_row("SELECT "
			"listener_id, sid, listener_lock, listener_lock_sid, listener_lock_counter, listener_voted_entry "
			"FROM r4_listeners "
			"WHERE user_id = %s AND listener_purge = FALSE", (self.id,))
		if listener:
			self.data.update(listener)
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
		
	def is_anonymous(self):
		return self.id > 1
		
	def has_requests(self, sid = False):
		if self.id <= 1:
			return False
		elif sid:
			return db.c.fetch_var("SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s AND sid = %s", (sid, self.id))
		else:
			return db.c.fetch_var("SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s", (self.id,))
			
	def put_in_request_line(self, sid):
		if self.id <= 1:
			return False
		else:
			already_lined = db.c.fetch_row("SELECT * FROM r4_request_line WHERE user_id = %s", (self.id,))
			if already_lined and already_lined['sid'] == sid:
				return True
			elif already_lined:
				self.remove_from_request_line()
			return (db.c.update("INSERT INTO r4_request_line (user_id, sid) VALUES (%s, %s)", (self.id, sid)) > 0)
			
	def remove_from_request_line(self):
		return (db.c.update("DELETE FROM r4_request_line WHERE user_id = %s", (self.id,)) > 0)
		
	def is_in_request_line(self):
		return (db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s", (self.id,)) > 0)
		
	def get_top_request_song_id(self, sid):
		return db.c.fetch_var("SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_request_store.sid = %s AND song_exists = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE ORDER BY reqstor_order, reqstor_id", (self.id, sid))
		
	def get_top_request_sid(self):
		return db.c.fetch_var("SELECT reqstor_id FROM r4_request_store WHERE user_id = %s ORDER BY reqstor_order, reqstor_id LIMIT 1", (self.id,))
		
	def get_request_line_position(self, sid):
		if self.id <= 1:
			return False
		if self.id in cache.get_station(sid, "request_user_positions"):
			return cache.get_station(sid, "request_user_positions")[self.id]
						
	def get_request_expiry(self):
		if self.id <= 1:
			return None
		if self.id in cache.get("request_expire_times"):
			return cache.get("request_expire_times")[self.id]

	def lock_to_sid(self, sid, lock_count):
		self.data['listener_lock'] = True
		self.data['listener_lock_sid'] = sid
		self.data['listener_lock_counter'] = lock_count
		return db.c.update("UPDATE r4_listeners SET listener_lock = TRUE, listener_lock_sid = %s, listener_lock_counter = %s WHERE listener_id = %s", (sid, lock_count, self.data['listener_id']))
		
	def update(self, hash):
		self.data.update(hash)
		# TODO: Update listener's cache record

	def generate_listen_key(self):
		listen_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(10))
		db.c.update("UPDATE phpbb_users SET radio_listenkey = %s WHERE user_id = %s", (listen_key, self.id))
		self.update({ "radio_listen_key": listen_key })

	def ensure_api_key(self, ip_address = None):
		if self.id == 1 and ip_address:
			api_key = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE user_id = 1 AND api_ip = %s", (ip_address,))
			if not existing:
				api_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(15))
				db.c.update("INSERT INTO r4_api_keys (user_id, api_ip, api_key, api_is_rainwave, api_expiry) VALUES (1 %s, %s, TRUE, %s)", (ip_address, api_key, time.time() + 86400))
				# TODO: Delete expired anonymous API keys
			self.update({ "api_key": api_key })
		elif self.id > 1:
			api_key = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE user_id = %s", (self.id,))
			if not api_key:
				api_key = self.generate_api_key(True)
			self.update({ "api_key": api_key })

	def generate_api_key(self, is_rainwave = False):
		if self.id == 1:
			return False
		api_key = ''.join(random.choice(string.ascii_uppercase + string.digits + string.ascii_lowercase) for x in range(15))
		db.c.update("INSERT INTO r4_api_keys (user_id, api_key, api_is_rainwave) VALUES (%s, %s, %s)", (self.id, api_key, is_rainwave))
		return api_key