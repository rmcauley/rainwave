import tornado.web
import tornado.escape
import time
import re

from rainwave.user import User
from rainwave.playlist import SongNonExistent

from api import fieldtypes
from api.exceptions import APIException
from libs import config
from libs import log

# This is the Rainwave API main handling request class.  You'll inherit it in order to handle requests.
# Does a lot of form checking and validation of user/etc.  There's a request class that requires no authentication at the bottom of this module.

# VERY IMPORTANT: YOU MUST DECORATE YOUR CLASSES.

# from api.server import handle_api_url
# @handle_api_url(...)

# Pass a string there for the URL to handle at /api/[url] and the server will do the rest of the work.

class RainwaveHandler(tornado.web.RequestHandler):
	# The following variables can be overridden by you.
	# Fields is a hash with { "form_name" => (fieldtypes.[something], True|False } format, so that automatic form validation can be done for you.  True/False values are for required/optional.
	fields = {}
	# This URL variable is setup by the server decorator - DON'T TOUCH IT.
	url = False
	# Do we need a Rainwave auth key for this request?
	auth_required = True
	# return_name is used for documentation, can be an array.
	# If not inherited, return_key automatically turns into url + "_result".  Useful for simple requests like rate, vote, etc.
	return_name = None
	# Validate user's tuned in status first.
	tunein_required = False
	# Validate user's logged in status first.
	login_required = False
	# Validate user is a station administrator.
	admin_required = False
	# Validate user is currently DJing.
	dj_required = False
	# Do we need a valid SID as part of the submitted form?
	sid_required = True
	# Description string for documentation.
	description = "Undocumented."
	# Error codes for documentation.
	return_codes = None
	# Restricts requests to config.get("api_trusted_ip_addresses") (presumably 127.0.0.1)
	local_only = False
	# Should the user be free to vote and rate?
	unlocked_listener_only = False
	# Do we allow GET HTTP requests to this URL?  (standard is "no")
	allow_get = False
	# Hidden from public view in the help?
	hidden = False
	# Use phpBB session/token auth?
	phpbb_auth = False
	# Does the user need perks (donor/beta/etc) to see this request/page?
	perks_required = False
	
	def initialize(self, **kwargs):
		super(RequestHandler, self).initialize(**kwargs)
		if config.get("developer_mode") or config.test_mode or self.allow_get:
			self.get = self.post
		self.cleaned_args = {}
			
	def set_cookie(self, name, value, **kwargs):
		if isinstance(value, (int, long)):
			value = repr(value)
		super(RequestHandler, self).set_cookie(name, value, **kwargs)
		
	def get_argument(self, name):
		if name in self.cleaned_args:
			return self.cleaned_args[name]
		return super(RequestHandler, self).get_argument(name)
	
	def get_user_locale(self):
		return self.get_cookie("r4_lang", "en_CA")

	# Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
	def prepare(self):
		self._startclock = time.clock()
		self.request_ok = False
		self.user = None
		
		if self.local_only and not self.request.remote_ip in config.get("api_trusted_ip_addresses"):
			log.info("api", "Rejected %s request from %s" % (self.url, self.request.remote_ip))
			self.failed = True
			self.set_status(403)
			self.finish()

		if not self.return_name:
			self.return_name = self.url[self.url.rfind("/")+1:] + "_result"
		else:
			self.return_name = self.return_name
			
		if self.admin_required or self.dj_required:
			self.login_required = True
	
		if 'in_order' in self.request.arguments:
			self._output = []
			self._output_array = True
		else:
			self._output = {}
			self._output_array = False

		self.sid = fieldtypes.integer(self.get_cookie("r4_sid", 1))
		if "sid" in self.request.arguments:
			self.sid = int(self.get_argument("sid"))
		elif not self.sid:
			for possible_sid in config.station_ids:
				if self.request.host == config.get_station(possible_sid, "host"):
					self.sid = possible_sid
					break
		if not self.sid and self.sid_required:
			raise APIException("missing_station_id", "Missing station ID.", 400)
		if request_ok and self.sid and not self.sid in config.station_ids:
			raise APIException("invalid_station_id", "Invalid station ID.", 400)
		self.set_cookie("r4_sid", str(self.sid), expires_days=365, domain=config.get("cookie_domain"))

		for field, field_attribs in self.__class__.fields.iteritems():
			type_cast, required = field_attribs
			if required and field not in self.request.arguments:
				raise APIException("missing_argument", "Missing %s argument." % field, 400)
			elif not required and field not in self.request.arguments:
				pass
			else:
				parsed = type_cast(self.get_argument(field), self)
				if parsed == None:
					raise APIException("invalid_argument", "Invalid argument %s: %s" % (field, getattr(fieldtypes, "%s_error" % type_cast.__name__)), 400)
				else:
					self.cleaned_args[field] = parsed
				
		if self.phpbb_auth:
			self.phpbb_auth()
		else:
			self.rainwave_auth()
		
		if self.auth_required and not self.user:
			raise APIException("auth_required", "Authorization required.", 403)

		if self.login_required and (not self.user or self.user.is_anonymous()):
			raise APIException("login_required", "Login required for %s." % self.url, 403)
		if self.tunein_required and (not self.user or not self.user.is_tunedin()):
			raise APIException("tunein_required", "You must be tuned in to use %s." % self.url, 403)
		if self.admin_required and (not self.user or not self.user.is_admin()):
			raise APIException("admin_required", "You must be an admin to use %s." % self.url, 403)
		if self.dj_required and (not self.user or not self.user.is_dj()):
			raise APIException("dj_required", "You must be DJing to use %s." % self.url, 403)
		if self.perks_required and (not self.user or not self.user.has_perks()):
			raise APIException("perks_required", "Must be a donor or VIP user to use %s." % self.url, 403)
				
		if self.unlocked_listener_only and not self.user:
			raise APIException("auth_required", "Authorization required.", 403)
		elif self.unlocked_listener_only and self.user.data['listener_lock'] and self.user.data['listener_lock_sid'] != self.sid:
			raise APIException("unlocked_only", "User locked to %s for %s more songs." % (config.station_id_friendly[self.user.data['listener_lock_sid']], self.user.data['listener_lock_counter']), 403)

	def phpbb_auth(self):
		phpbb_cookie_name = config.get("phpbb_cookie_name")
		self.user = None
		if not fieldtypes.integer(self.get_cookie(phpbb_cookie_name + "u", "")):
			self.user = User(1)
		else:
			user_id = int(self.get_cookie(phpbb_cookie_name + "u"))
			if self.get_cookie(phpbb_cookie_name + "sid") and self._update_phpbb_session():
				self.user = User(user_id)
				self.user.authorize(self.sid, None, None, True)

			if not self.user and self.get_cookie(phpbb_cookie_name + "k"):
				can_login = db.c_old.fetch_var("SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s", (hashlib.md5(self.get_cookie(phpbb_cookie_name + "k")).hexdigest(), user_id))
				if can_login == 1:
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)
					
	def _update_phpbb_session(self):
		session_id = db.c_old.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_id = %s AND session_user_id = %s", (self.get_cookie(phpbb_cookie_name + "sid"), user_id))
		if session_id:
			db.c_old.update("UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s", (int(time.time()), "rainwave", session_id))
		return session_id

	def rainwave_auth(self):
		user_id_present = "user_id" in self.request.arguments
		
		if self.auth_required and not user_id_present:
			raise APIException("missing_argument", "Missing user_id argument.", 400)
		if user_id_present and not fieldtypes.numeric(self.get_argument("user_id")):
			# do not spit out the user ID back at them, that would create a potential XSS hack
			raise APIException("invalid_argument", "Invalid user ID.", 400)
		if (self.auth_required or user_id_present) and not "key" in self.request.arguments:
			raise APIException("missing_argument", "Missing 'key' argument.", 400)
		
		self.user = None
		if request_ok and user_id_present:
			self.user = User(long(self.get_argument("user_id")))
			self.user.authorize(self.sid, self.request.remote_ip, self.get_argument("key"))
			if not self.user.authorized:
				raise APIException("auth_failed", "Authorization failed.", 403)
				# In case the raise is suppressed
				self.user = None
			else:
				self._update_phpbb_session()
				self.sid = self.user.request_sid

	# Handles adding dictionaries for JSON output
	# Will return a "code" if it exists in the hash passed in, if not, returns True
	def append(self, key, hash):
		if hash == None:
			return
		if self._output_array:
			self._output.append({ key: hash })
		else:
			self._output[key] = hash
		if "code" in hash:
			return hash["code"]
		return True
	
	def append_standard(self, tl_key, text = None, success = True, **kwargs):
		# TODO: Add translation layer here for when text is None
		self.append(self.return_name, kwargs.update({ "success": success, "tl_key": tl_key, "text": text }))
	
class APIHandler(RainwaveHandler):
	def finish(self, chunk=None):
		self.set_header("Content-Type", "application/json")
		if hasattr(self, "_output"):
			if hasattr(self, "_startclock"):
				exectime = time.clock() - self._startclock
			else:
				exectime = -1
			self.append("api_info", { "exectime": exectime, "time": round(time.time()) })
			self.write(tornado.escape.json_encode(self._output))
		super(RequestHandler, self).finish(chunk)

	def write_error(self, status_code, **kwargs):
		if self._output_array:
			self._output = []
		else:
			self._output = {}
		if kwargs.has_key("exc_info"):
			exc = kwargs['exc_info'][1]
			if isinstance(exc, APIException):
				self.append(self.return_name, exc.jsonable())
			elif exc.__class__.__name__ == "SongNonExistent":
				self.append("error", { "tl_key": "song_does_not_exist", "text": "Song does not exist." })
			else:
				self.append("error", { "tl_key": "internal_error", "text": repr(exc) })
		else:
			self.append("error", { "tl_key": "internal_error", "text": self._reason } )
		self.finish()

class HTMLRequest(RainwaveHandler):
	phpbb_auth = True
