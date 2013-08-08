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
import api.returns

# This is the Rainwave API main handling request class.  You'll inherit it in order to handle requests.
# Does a lot of form checking and validation of user/etc.  There's a request class that requires no authentication at the bottom of this module.

# VERY IMPORTANT: YOU MUST DECORATE YOUR CLASSES.

# from api.server import handle_api_url
# @handle_api_url(...)

# Pass a string there for the URL to handle at /api/[url] and the server will do the rest of the work.

class RequestHandler(tornado.web.RequestHandler):
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
			
		request_ok = True
		
		self.sid = None
		if "sid" in self.request.arguments:
			self.sid = int(self.get_argument("sid"))
		elif self.sid_required:
			self.append("error", api.returns.ErrorReturn(400, "Missing station ID argument."))
			request_ok = False
		if request_ok and self.sid and not self.sid in config.station_ids:
			self.append("error", api.returns.ErrorReturn(400, "Invalid station ID."))
			request_ok = False

		for field, field_attribs in self.__class__.fields.iteritems():
			type_cast, required = field_attribs
			if required and field not in self.request.arguments:
				self.append("error", api.returns.ErrorReturn(400, "Missing %s argument." % field))
				request_ok = False
			elif not required and field not in self.request.arguments:
				pass
			else:
				parsed = type_cast(self.get_argument(field), self)
				if parsed == None:
					self.append("error", api.returns.ErrorReturn(400, "Invalid argument %s: %s" % (field, getattr(fieldtypes, "%s_error" % type_cast.__name__))))
					request_ok = False
				else:
					self.cleaned_args[field] = parsed
				
		if request_ok:
			authorized = self.rainwave_auth()
			if self.auth_required and not authorized:
				request_ok = False
				
		if self.unlocked_listener_only and self.user and self.user.data['listener_lock'] and self.user.data['listener_lock_sid'] != self.sid:
			request_ok = False
			self.append("error", api.returns.ErrorReturn(601, "User locked to %s for %s more songs." % (config.station_id_friendly[self.user.data['listener_lock_sid']], self.user.data['listener_lock_counter'])))
		elif self.unlocked_listener_only and not self.user:
			request_ok = False
			self.append("error", api.returns.ErrorReturn(601, "User cannot be locked to a station, but no user record found."))
				
		self.request_ok = request_ok
		if not request_ok:
			self.finish()
	
	def rainwave_auth(self):
		request_ok = True
		user_id_present = "user_id" in self.request.arguments
		
		if self.auth_required and not user_id_present:
			self.append("error", api.returns.ErrorReturn(400, "Missing user_id argument."))
			request_ok = False
		if user_id_present and not fieldtypes.numeric(self.get_argument("user_id")):
			self.append("error", api.returns.ErrorReturn(400, "Invalid user ID %s."))
			request_ok = False
		if (self.auth_required or user_id_present) and not "key" in self.request.arguments:
			self.append("error", api.returns.ErrorReturn(400, "Missing 'key' argument."))
			request_ok = False
		
		self.user = None
		if request_ok and user_id_present:
			self.user = User(long(self.get_argument("user_id")))
			self.user.authorize(self.sid, self.request.remote_ip, self.get_argument("key"))
			if not self.user.authorized:
				self.append("error", api.returns.ErrorReturn(401, "Authorization failed."))
				request_ok = False
			else:
				self.sid = self.user.request_sid
		
		if self.auth_required and not self.user:
			self.append("error", api.returns.ErrorReturn(401, "Authorization required."))
			request_ok = False
		
		if self.user and request_ok:
			if self.login_required and self.user.is_anonymous():
				self.append("error", api.returns.ErrorReturn(401, "Login required for %s." % self.url))
				request_ok = False
			if self.tunein_required and not self.user.is_tunedin():
				self.append("error", api.returns.ErrorReturn(602, "You must be tuned in to use %s." % self.url))
				request_ok = False
			if self.admin_required and not self.user.is_admin():
				self.append("error", api.returns.ErrorReturn(403, "You must be an admin to use %s." % self.url))
				request_ok = False
			if self.dj_required and not self.user.is_dj():
				self.append("error", api.returns.ErrorReturn(403, "You must be DJing to use %s." % self.url))
				request_ok = False
		
		return request_ok

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

	# Sends off the data to the user.
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
				self.append("error", { "code": 0, "key": "song_does_not_exist", "text": "Song does not exist." })
			else:
				self.append("error", { "code": 500, "key": "internal_error", "text": repr(exc) })
		else:
			self.append("error", { "code": status_code, "key": "internal_error", "text": self._reason } )
		self.finish()
