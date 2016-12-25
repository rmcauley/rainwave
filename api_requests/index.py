# coding=utf-8

import os
import tornado.web

import api.web
import api.locale
from api.server import handle_url, handle_api_url
from api_requests import info
from api.exceptions import APIException

from libs import cache
from libs import config
from libs import buildtools
from rainwave.user import User

@handle_url("/blank")
class Blank(api.web.HTMLRequest):
	auth_required = False
	login_required = False

	def get(self):
		self.write(self.render_string("bare_header.html", title="Blank"))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/(?:index.html)?")
class MainIndex(api.web.HTMLRequest):
	description = "Main Rainwave page."
	auth_required = config.has("index_requires_login") and config.get("index_requires_login")
	login_required = config.has("index_requires_login") and config.get("index_requires_login")
	sid_required = False
	beta = False
	page_template = "r5_index.html"
	js_dir = "js5"

	def set_default_headers(self):
		self.set_header("X-Frame-Options", "SAMEORIGIN")

	def prepare(self):
		super(MainIndex, self).prepare()

		if not cache.get_station(self.sid, "sched_current"):
			raise APIException("server_just_started", "Rainwave is Rebooting, Please Try Again in a Few Minutes", http_code=500)

		# self.json_payload = {}
		self.jsfiles = None

		if not self.user:
			self.user = User(1)
		self.user.ip_address = self.request.remote_ip
		self.user.ensure_api_key()

		if self.beta or config.get("web_developer_mode") or config.get("developer_mode") or config.get("test_mode"):
			buildtools.bake_beta_css()
			buildtools.bake_beta_templates()
			self.jsfiles = []
			for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/%s" % self.js_dir)):	#pylint: disable=W0612
				for f in files:
					if f.endswith(".js"):
						self.jsfiles.append(os.path.join(root[root.find("static/%s" % self.js_dir):], f))

	# def append(self, key, value):
	# 	self.json_payload[key] = value

	def get(self):
		self.mobile = self.request.headers.get("User-Agent").lower().find("mobile") != -1 or self.request.headers.get("User-Agent").lower().find("android") != -1
		# if not self.beta:
		# 	info.attach_info_to_request(self, extra_list=self.get_cookie("r4_active_list"))
		# self.append("api_info", { "time": int(timestamp()) })
		page_title = None
		if (self.sid == config.get("default_station")):
			page_title = self.locale.translate("page_title_on_google")
		else:
			page_title = "%s %s" % (self.locale.translate("page_title_on_google"), self.locale.translate("station_name_%s" % self.sid))
		self.render(
			self.page_template,
			request=self,
			site_description=self.locale.translate("station_description_id_%s" % self.sid),
			revision_number=config.build_number,
			jsfiles=self.jsfiles,
			# api_url=config.get("api_external_url_prefix"),
			# cookie_domain=config.get("cookie_domain"),
			# locales=api.locale.locale_names_json,
			# relays=config.public_relays_json[self.sid],
			# stream_filename=config.get_station(self.sid, "stream_filename"),
			# station_list=config.station_list_json,
			mobile=self.mobile,
			station_name=page_title,
			dj=self.user.is_dj()
		)

@handle_url("/dj")
class DJIndex(MainIndex):
	dj_required = True

@handle_url("/beta")
class BetaRedirect(tornado.web.RequestHandler):
	help_hidden = True

	def prepare(self):
		self.redirect("/beta/", permanent=True)

@handle_url("/beta/")
class BetaIndex(MainIndex):
	beta = True
	page_template = "r5_index.html"
	js_dir = "js5"

	def prepare(self):
		if not config.get("public_beta"):
			self.perks_required = True
		super(BetaIndex, self).prepare()

@handle_url("/beta/dj")
class DJBetaIndex(MainIndex):
	dj_required = True

@handle_api_url("bootstrap")
class Bootstrap(api.web.APIHandler):
	description = (
		"Bootstrap a Rainwave client.  Provides user info, API key, station info, relay info, and more.  "
		"If you run a GET query to this URL, you will receive a Javascript file containing a single variable called BOOTSTRAP.  While this is largely intended for the purposes of the main site, you may use this.  "
		"If you run a POST query to this URL, you will receive a JSON object without the extra data put into BOOTSTRAP that the official Rainwave site requires."
	)
	phpbb_auth = True
	auth_required = False
	login_required = False
	sid_required = False
	allow_get = False

	def prepare(self):
		super(Bootstrap, self).prepare()
		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key()

	def get(self):
		self.set_header("Content-Type", "text/javascript")
		self.append("locales", api.locale.locale_names)
		self.append("cookie_domain", config.get("cookie_domain"))
		self.append("on_init", [])
		self.append("on_measure", [])
		self.append("on_draw", [])
		self.append("websocket_host", config.get("websocket_host"))
		self.post()
		if self.request.headers.get("User-Agent").lower().find("mobile") != -1 or self.request.headers.get("User-Agent").lower().find("android") != -1:
			self.write("window.MOBILE = true;")
		else:
			self.write("window.MOBILE = false;")
		self.write("var BOOTSTRAP=")

	def post(self):
		info.attach_info_to_request(self, live_voting=True)
		self.append("stream_filename", config.get_station(self.sid, "stream_filename"))
		self.append("station_list", config.station_list)
		self.append("relays", config.public_relays[self.sid])

@handle_api_url("bootstrap_dj")
class DJBootstrap(Bootstrap):
	dj_required = True
