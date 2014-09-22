import tornado.web
import tornado.escape
import tornado.httputil
import time
import traceback
import types
import hashlib
import psycopg2

from rainwave.user import User
from rainwave.playlist_objects.song import SongNonExistent

from api import fieldtypes
from api import locale
from api.exceptions import APIException
from libs import config
from libs import log
from libs import db

# This is the Rainwave API main handling request class.  You'll inherit it in order to handle requests.
# Does a lot of form checking and validation of user/etc.  There's a request class that requires no authentication at the bottom of this module.

# VERY IMPORTANT: YOU MUST DECORATE YOUR CLASSES.

# from api.server import handle_api_url
# @handle_api_url(...)

# Pass a string there for the URL to handle at /api/[url] and the server will do the rest of the work.

class Error404Handler(tornado.web.RequestHandler):
	def get(self):
		self.post()

	def post(self):
		self.set_status(404)
		if "in_order" in self.request.arguments:
			self.write("[")
		self.write(tornado.escape.json_encode({ "error": { "tl_key": "http_404", "text": "404 Not Found" } }))
		if "in_order" in self.request.arguments:
			self.write("]")
		self.finish()

class HTMLError404Handler(tornado.web.RequestHandler):
	def get(self):
		self.post()

	def post(self):
		self.set_status(404)
		self.write(self.render_string("basic_header.html", title="HTTP 404 - File Not Found"))
		self.write("<p><a href='http://rainwave.cc' target='_top'>Return to the front page.</a></p>")
		self.write(self.render_string("basic_footer.html"))
		self.finish()

class RainwaveHandler(tornado.web.RequestHandler):
	# The following variables can be overridden by you.
	# Fields is a hash with { "form_name" => (fieldtypes.[something], True|False|None } format, so that automatic form validation can be done for you.  True/False values are for required/optional.
	# A True requirement means it must be present and valid
	# A False requirement means it is optional, but if present, must be valid
	# A None requirement means it is optional, and if present and invalid, will be set to None
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
	# Use phpBB session/token auth?
	phpbb_auth = False
	# Does the user need perks (donor/beta/etc) to see this request/page?
	perks_required = False
	# hide from help, meant really only for things like redirect pages
	help_hidden = False
	# automatically add pagination to an API request.  use self.get_sql_limit_string()!
	pagination = False

	def __init__(self, *args, **kwargs):
		super(RainwaveHandler, self).__init__(*args, **kwargs)
		self.cleaned_args = {}
		self.cookie_prefs = {}
		self.sid = None
		self._startclock = time.time()
		self.user = None
		self._output = None
		self._output_array = False

	def initialize(self, **kwargs):
		super(RainwaveHandler, self).initialize(**kwargs)
		if self.pagination:
 			self.fields['per_page'] = (fieldtypes.zero_or_greater_integer, False)
 			self.fields['page_start'] = (fieldtypes.zero_or_greater_integer, False)

	def set_cookie(self, name, value, *args, **kwargs):
		if isinstance(value, (int, long)):
			value = repr(value)
		super(RainwaveHandler, self).set_cookie(name, value, *args, **kwargs)

	def get_argument(self, name, *args, **kwargs):
		if name in self.cleaned_args:
			return self.cleaned_args[name]
		return super(RainwaveHandler, self).get_argument(name, *args, **kwargs)

	def set_argument(self, name, value):
		self.cleaned_args[name] = value

	def get_browser_locale(self, default="en_CA"):
		"""Determines the user's locale from ``Accept-Language`` header.  Copied from Tornado, adapted slightly.

		See http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
		"""
		if "rw_lang" in self.cookies:
			if locale.RainwaveLocale.exists(self.cookies['rw_lang'].value):
				return locale.RainwaveLocale.get(self.cookies['rw_lang'].value)
		if "Accept-Language" in self.request.headers:
			languages = self.request.headers["Accept-Language"].split(",")
			locales = []
			for language in languages:
				parts = language.strip().split(";")
				if len(parts) > 1 and parts[1].startswith("q="):
					try:
						score = float(parts[1][2:])
					except (ValueError, TypeError):
						score = 0.0
				else:
					score = 1.0
				locales.append((parts[0], score))
			if locales:
				locales.sort(key=lambda pair: pair[1], reverse=True)
				codes = [l[0] for l in locales]
				return locale.RainwaveLocale.get_closest(codes)
		return locale.RainwaveLocale.get(default)

	# Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
	def prepare(self):
		if self.local_only and not self.request.remote_ip in config.get("api_trusted_ip_addresses"):
			log.info("api", "Rejected %s request from %s, untrusted address." % (self.url, self.request.remote_ip))
			raise APIException("rejected", text="You are not coming from a trusted address.")

		if not isinstance(self.locale, locale.RainwaveLocale):
			self.locale = self.get_browser_locale()

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

		self.sid = fieldtypes.integer(self.get_cookie("r4_sid", None))
		hostname = self.request.headers.get('Host', None)
		if hostname:
			hostname = unicode(hostname).split(":")[0]
			if hostname in config.station_hostnames:
				self.sid = config.station_hostnames[hostname]
		self.sid = fieldtypes.integer(self.get_argument("sid", None)) or self.sid
		if self.sid and not self.sid in config.station_ids:
			self.sid = None
		if not self.sid and self.sid_required:
			raise APIException("missing_station_id", http_code=400)

		for field, field_attribs in self.__class__.fields.iteritems():
			type_cast, required = field_attribs
			if required and field not in self.request.arguments:
				raise APIException("missing_argument", argument=field, http_code=400)
			elif not required and field not in self.request.arguments:
				self.cleaned_args[field] = None
			else:
				parsed = type_cast(self.get_argument(field), self)
				if parsed == None and required != None:
					raise APIException("invalid_argument", argument=field, reason="%s %s" % (field, getattr(fieldtypes, "%s_error" % type_cast.__name__)), http_code=400)
				else:
					self.cleaned_args[field] = parsed

		if not self.sid and not self.sid_required:
			self.sid = 5
		if not self.sid in config.station_ids:
			raise APIException("invalid_station_id", http_code=400)
		self.set_cookie("r4_sid", str(self.sid), expires_days=365, domain=config.get("cookie_domain"))

		if self.phpbb_auth:
			self.do_phpbb_auth()
		else:
			self.rainwave_auth()

		if not self.user and self.auth_required:
			raise APIException("auth_required", http_code=403)
		elif not self.user and not self.auth_required:
			self.user = User(1)
			self.user.ip_address = self.request.remote_ip
		
		self.user.refresh(self.sid)

		if self.login_required and (not self.user or self.user.is_anonymous()):
			raise APIException("login_required", http_code=403)
		if self.tunein_required and (not self.user or not self.user.is_tunedin()):
			raise APIException("tunein_required", http_code=403)
		if self.admin_required and (not self.user or not self.user.is_admin()):
			raise APIException("admin_required", http_code=403)
		if self.dj_required and (not self.user or not self.user.is_dj()):
			raise APIException("dj_required", http_code=403)
		if self.perks_required and (not self.user or not self.user.has_perks()):
			raise APIException("perks_required", http_code=403)

		if self.unlocked_listener_only and not self.user:
			raise APIException("auth_required", http_code=403)
		elif self.unlocked_listener_only and self.user.data['lock'] and self.user.data['lock_sid'] != self.sid:
			raise APIException("unlocked_only", station=config.station_id_friendly[self.user.data['lock_sid']], lock_counter=self.user.data['lock_counter'], http_code=403)

	def do_phpbb_auth(self):
		phpbb_cookie_name = config.get("phpbb_cookie_name")
		user_id = fieldtypes.integer(self.get_cookie(phpbb_cookie_name + "u", ""))
		if not user_id:
			pass
		else:
			if self._verify_phpbb_session(user_id):
				# update_phpbb_session is done by verify_phpbb_session if successful
				self.user = User(user_id)
				self.user.authorize(self.sid, None, None, True)
				return True

			if not self.user and self.get_cookie(phpbb_cookie_name + "k"):
				can_login = db.c.fetch_var("SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s", (hashlib.md5(self.get_cookie(phpbb_cookie_name + "k")).hexdigest(), user_id))
				if can_login == 1:
					self._update_phpbb_session(self._get_phpbb_session(user_id))
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)
					return True
		return False

	def _verify_phpbb_session(self, user_id = None):
		# TODO: Do we want to enhance this with IP checking and other bits and pieces like phpBB does?
		if not user_id and not self.user:
			return None
		if not user_id:
			user_id = self.user.id
		cookie_session = self.get_cookie(config.get("phpbb_cookie_name") + "sid")
		if cookie_session:
			if cookie_session == db.c.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s AND session_id = %s", (user_id, cookie_session)):
				self._update_phpbb_session(cookie_session)
				return cookie_session
		return None

	def _get_phpbb_session(self, user_id = None):
		return db.c.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s ORDER BY session_last_visit DESC LIMIT 1", (user_id,))

	def _update_phpbb_session(self, session_id):
		db.c.update("UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s", (int(time.time()), "rainwave", session_id))

	def rainwave_auth(self):
		user_id_present = "user_id" in self.request.arguments

		if self.auth_required and not user_id_present:
			raise APIException("missing_argument", argument="user_id", http_code=400)
		if user_id_present and not fieldtypes.numeric(self.get_argument("user_id")):
			# do not spit out the user ID back at them, that would create a potential XSS hack
			raise APIException("invalid_argument", argument="user_id", reason="not numeric.", http_code=400)
		if (self.auth_required or user_id_present) and not "key" in self.request.arguments:
			raise APIException("missing_argument", argument="key", http_code=400)

		if user_id_present:
			self.user = User(long(self.get_argument("user_id")))
			self.user.authorize(self.sid, self.request.remote_ip, self.get_argument("key"))
			if not self.user.authorized:
				raise APIException("auth_failed", http_code=403)
			else:
				self._update_phpbb_session(self._get_phpbb_session(self.user.id))

	# Handles adding dictionaries for JSON output
	# Will return a "code" if it exists in the hash passed in, if not, returns True
	def append(self, key, dct):
		if dct == None:
			return
		if self._output_array:
			self._output.append({ key: dct })
		else:
			self._output[key] = dct
		if "code" in dct:
			return dct["code"]
		return True

	def append_standard(self, tl_key, text = None, success = True, return_name = None, **kwargs):
		if not text:
			text = self.locale.translate(tl_key, **kwargs)
		kwargs.update({ "success": success, "tl_key": tl_key, "text": text })
		if return_name:
			self.append(return_name, kwargs)
		else:
			self.append(self.return_name, kwargs)

	def write_error(self, status_code, **kwargs):
		if kwargs.has_key("exc_info"):
			exc = kwargs['exc_info'][1]
			if isinstance(exc, APIException):
				exc.localize(self.locale)
				log.debug("exception", exc.reason)

	def get_sql_limit_string(self):
		if not self.pagination:
			return ""
		limit = ""
		if self.get_argument("per_page") != None:
			if self.get_argument("per_page") == "0":
				limit = "LIMIT ALL"
			else:
				limit = "LIMIT %s" % self.get_argument("per_page")
		else:
			limit = "LIMIT 100"
		if self.get_argument("page_start"):
			limit += " OFFSET %s" % self.get_argument("page_start")
		return limit

class APIHandler(RainwaveHandler):
	def initialize(self, **kwargs):
		super(APIHandler, self).initialize(**kwargs)
		if config.get("developer_mode") or config.test_mode or self.allow_get:
			self.get = self.post

	def finish(self, chunk=None):
		self.set_header("Content-Type", "application/json")
		if hasattr(self, "_output"):
			if hasattr(self, "_startclock"):
				exectime = time.time() - self._startclock
			else:
				exectime = -1
			if exectime > 0.5:
				log.warn("long_request", "%s took %s to execute!" % (self.url, exectime))
			self.append("api_info", { "exectime": exectime, "time": round(time.time()) })
			self.write(tornado.escape.json_encode(self._output))
		super(APIHandler, self).finish(chunk)

	def write_error(self, status_code, **kwargs):
		if self._output_array:
			self._output = []
		else:
			self._output = {}
		if kwargs.has_key("exc_info"):
			exc = kwargs['exc_info'][1]

			# Restart DB on a connection error if that's what we're handling
			if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
				try:
					db.close()
					db.connect()
					self.append("error", { "code": 500, "tl_key": "db_error_retry", "text": self.locale.translate("db_error_retry") })
				except:
					self.append("error", { "code": 500, "tl_key": "db_error_permanent", "text": self.locale.translate("db_error_permanent") })
			elif isinstance(exc, APIException):
				exc.localize(self.locale)
				self.append(self.return_name, exc.jsonable())
			elif isinstance(exc, SongNonExistent):
				self.append("error", { "code": status_code, "tl_key": "song_does_not_exist", "text": self.locale.translate("song_does_not_exist") })
			else:
				self.append("error", { "code": status_code, "tl_key": "internal_error", "text": repr(exc) })
				self.append("traceback", { "traceback": traceback.format_exception(kwargs['exc_info'][0], kwargs['exc_info'][1], kwargs['exc_info'][2]) })
		else:
			self.append("error", { "tl_key": "internal_error", "text": self.locale.translate("internal_error") } )
		self.finish()

def _html_write_error(self, status_code, **kwargs):
	if kwargs.has_key("exc_info"):
		exc = kwargs['exc_info'][1]

		# Restart DB on a connection error if that's what we're handling
		if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
			try:
				db.close()
				db.connect()
				self.append("error", { "code": 500, "tl_key": "db_error_retry", "text": self.locale.translate("db_error_retry") })
			except:
				self.append("error", { "code": 500, "tl_key": "db_error_permanent", "text": self.locale.translate("db_error_permanent") })
		elif isinstance(exc, APIException):
			if not isinstance(self.locale, locale.RainwaveLocale):
				exc.localize(locale.RainwaveLocale.get("en_CA"))
			else:
				exc.localize(self.locale)
		if (isinstance(exc, APIException) or isinstance(exc, tornado.web.HTTPError)) and exc.reason:
			self.write(self.render_string("basic_header.html", title="%s - %s" % (status_code, exc.reason)))
		else:
			self.write(self.render_string("basic_header.html", title="HTTP %s - %s" % (status_code, tornado.httputil.responses.get(status_code, 'Unknown'))))
		if status_code == 500 or config.get("developer_mode"):
			self.write("<p>")
			self.write(self.locale.translate("unknown_error_message"))
			self.write("</p><p>")
			self.write(self.locale.translate("debug_information"))
			self.write("</p><div class='json'>")
			for line in traceback.format_exception(kwargs['exc_info'][0], kwargs['exc_info'][1], kwargs['exc_info'][2]):
				self.write(line)
			self.write("</div>")
	self.finish()

class HTMLRequest(RainwaveHandler):
	phpbb_auth = True
	allow_get = True
	write_error = _html_write_error

# this mixin will overwrite anything in APIHandler and RainwaveHandler so be careful wielding it
class PrettyPrintAPIMixin(object):
	phpbb_auth = True
	allow_get = True
	write_error = _html_write_error

	# reset the initialize to ignore overwriting self.get with anything
	# TODO: stop fucking monkeypatching you dipshit
	def initialize(self, *args, **kwargs):
		super(APIHandler, self).initialize(*args, **kwargs)
		# yaaaaaaay monkey patching :/
		self._real_post = self.post
		self.post = self.post_reject

	def prepare(self):
		super(APIHandler, self).prepare()
		self._real_post()

	def get(self, write_header=True):
		if write_header:
			self.write(self.render_string("basic_header.html", title=self.locale.translate(self.return_name)))
		per_page = None
		per_page_link = None
		previous_page_start = None
		next_page_start = None
		if self.pagination and "per_page" in self.fields and self.get_argument("per_page") != 0:
			per_page = self.get_argument("per_page")
			if not per_page:
				per_page = 100
			if self.get_argument("page_start"):
				previous_page_start = self.get_argument("page_start") - per_page
				next_page_start = self.get_argument("page_start") + per_page
			else:
				next_page_start = per_page

			per_page_link = "%s?" % self.url
			for field in self.fields.keys():
				if field == "page_start":
					pass
				elif field == "per_page":
					per_page_link += "%s=%s&" % (field, per_page)
				else:
					per_page_link += "%s=%s&" % (field, self.get_argument(field))

			if self.get_argument("page_start") and self.get_argument("page_start") > 0:
				self.write("<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>" % (per_page_link, previous_page_start))
			if self.return_name in self._output and len(self._output[self.return_name]) >= per_page:
				self.write("<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>" % (per_page_link, next_page_start))
			elif not self.return_name in self._output:
				self.write("<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>" % (per_page_link, next_page_start))
		for output_key, json in self._output.iteritems():
			if type(json) != types.ListType:
				continue
			if len(json) > 0:
				self.write("<table><th>#</th>")
				keys = self.sort_keys(json[0].keys())
				for key in keys:
					self.write("<th>%s</th>" % self.locale.translate(key))
				self.header_special()
				self.write("</th>")
				i = 1
				if "page_start" in self.request.arguments:
					i += self.get_argument("page_start")
				for row in json:
					self.write("<tr><td>%s</td>" % i)
					for key in keys:
						self.write("<td>%s</td>" % row[key])
					self.row_special(row)
					self.write("</tr>")
					i = i + 1
				self.write("</table>")
		if self.pagination and "per_page" in self.fields and self.get_argument("per_page") != 0:
			if self.get_argument("page_start") and self.get_argument("page_start") > 0:
				self.write("<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>" % (per_page_link, previous_page_start))
			if self.return_name in self._output and len(self._output[self.return_name]) >= per_page:
				self.write("<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>" % (per_page_link, next_page_start))
			elif not self.return_name in self._output:
				self.write("<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>" % (per_page_link, next_page_start))
		self.write(self.render_string("basic_footer.html"))

	def header_special(self):
		pass

	def row_special(self, row):
		pass

	def sort_keys(self, keys):
		new_keys = []
		for key in [ "rating_user", "fave", "title", "album_rating_user", "album_name" ]:
			if key in keys:
				new_keys.append(key)
				keys.remove(key)
		new_keys.extend(keys)
		return new_keys

	# no JSON output!!
	def finish(self):
		super(APIHandler, self).finish()

	# see initialize, this will override the JSON POST function
	def post_reject(self):
		return None
