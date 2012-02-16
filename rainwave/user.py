import copy
import time
import re

from libs import log
from libs.cache import cache
from libs import db

_AVATAR_PATH = "/forums/download/file.php?avatar=%s"

class User(object):
	def __init__(self, user_id):
		self.id = user_id
		self.authorized = False
		self.ip_address = False
		
		self.request_sid = 0
		self.api_key = False
		self.official_ui = False
		
		self.data = {}
		self.data['radio_admin'] = 0
		self.data['radio_dj'] = 0
		self.data['radio_tuned_in'] = False
		self.data['radio_perks'] = False
		self.data['radio_request_position'] = 0
		self.data['radio_request_expires_at'] = 0
		self.data['user_avatar'] = "images/blank.png"
		self.data['user_new_privmsg'] = 0
		self.data['radio_last_news'] = 0
		self.data['radio_listen_key'] = ''
		self.data['user_id'] = 1
		self.data['username'] = "Anonymous"
		self.data['sid'] = 0
		self.data['listener_lock'] = False
		self.data['listener_lock_sid'] = None
		self.data['listener_lock_counter'] = 0
		self.data['listener_voted_entry'] = 0
		self.data['listener_id'] = 0

	def authorize(self, sid, ip_address, api_key):
		self.request_sid = sid
		self.ip_address = ip_address
		self.api_key = api_key
				
		if not re.match('^[\w\d]+$', api_key):
			return
		
		if self.id > 1:
			self._auth_registered_user(ip_address, api_key)
		else:
			self._auth_anon_user(ip_address, api_key)
		if self.authorized:
			self.refresh()

	def _auth_registered_user(self, ip_address, api_key):
		r = db.c.fetch_row("SELECT api_key, api_is_rainwave FROM r4_api_keys WHERE user_id = %s AND api_key = %s", (self.id, api_key))
		if not r:
			log.debug("auth", "Invalid user ID %s and/or API key %s." % (self.id, api_key))
			return
		if r['api_is_rainwave']:
			self._official_ui = True

		# Set as authorized and begin populating information
		# Pay attention to the "AS _variable" names in the SQL fields, they won't get exported to private JSONable dict
		self.authorized = True
		user_data = db.c.fetch_row("SELECT user_id, username, user_new_privmsg, user_avatar, user_avatar_type AS _user_avatar_type, radio_lastnews, radio_listen_key, group_id AS _group_id "
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
		
		# Universal radio admin (Liquid)
		if self.data['_group_id'] == 5:
			self.data['radio_admin'] = self.request_sid
		# jfinalfunk is a special case since he floats around outside the main admin groups
		elif self.id == 9575:
			self.data['radio_admin'] = self.request_sid
		# Individual station manager groups
		elif self.data['_group_id'] in [12, 15, 14, 17]:
			self.data['radio_admin'] = self.request_sid

	def _auth_anon_user(self, ip_address, api_key):
		auth_against = db.c.fetch_var("SELECT api_key FROM r4_api_keys WHERE api_ip = %s AND user_id = 1", (ip_address,))
		if not auth_against:
			log.debug(self, "user", "Anonymous user key %s not found." % api_key)
			return
		if auth_against != api_key:
			log.debug(self, "user", "Anonymous user key %s does not match DB key %s." % (api_key, auth_against))
			return
		self.authorized = True

	def refresh(self):
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
	
		if (self.id > 1):
			#TODO: Check for and grant special permission for being the signed-in DJ
			
			self.data['radio_request_position'] = self.get_request_line_position(self.data['sid'])
			self.data['radio_request_expires_at'] = self.get_request_expiry()
		
			if self.data['radio_tuned_in'] and not self.is_in_request_line() and self.has_requests():
				self.put_in_request_line(self.data['sid'])
			
	def set_event_tuned_in(self, sched_id):
		#TODO: Ensure that the user is set and saved to be tuned in for the current schedule ID as part of the station refresh
		cache.set_user_var(self, "tunedin", sched_id, True)

	def get_private_jsonable(self):
		"""
		Returns a JSONable dict containing data that the user will want to see or make use of.
		NOT for other users to see.
		"""
		public = {}
		for k, v in self.data.iteritems():
			if k[0] != '_':
				public[k] = v
		return public
		
	def get_public_jsonable(self):
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
			
	def get_request_line_position(self, sid):
		if self.id <= 1:
			return False
		# TODO: Make the line positions cached for each station centrally
		# Pull this data straight from the cache
						
	def get_request_expiry(self):
		if self.id <= 1:
			return None
		if self.data['radio_tuned_in']:
			return None
		position = db.c.fetch_row("SELECT * FROM r4_request_line WHERE user_id = %s", (self.id,))
		if not position:
			return None
		else:
			if not position['line_expiry_tune_in'] and not position['line_expiry_election']:
				return None
			if position['line_expiry_tune_in'] and not position['line_expiry_election']:
				return position['line_expiry_tune_in']
			elif position['line_expiry_election'] and not position['line_expiry_tune_in']:
				return position['line_expiry_election']
			elif position['line_expiry_election'] > position['line_expiry_tune_in']:
				return position['line_expiry_election']
			else:
				return position['line_expiry_tune_in']

		
	#TODO: you left off looking at getSongRating in the original lyre code