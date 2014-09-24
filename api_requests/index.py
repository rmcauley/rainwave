# coding=utf-8

import tornado.web
import tornado.escape
import time
import os

import api.web
import api.locale
from api.server import handle_url
from api_requests import info

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
	auth_required = False
	login_required = False
	sid_required = False
	beta = False

	def prepare(self):
		super(MainIndex, self).prepare()
		self.json_payload = {}
		self.jsfiles = None

		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key(self.request.remote_ip)

		if self.beta or config.get("web_developer_mode") or config.get("developer_mode") or config.get("test_mode"):
			buildtools.bake_css()
			self.jsfiles = []
			for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/js4")):
				for f in files:
					self.jsfiles.append(os.path.join(root[root.find("static/js4"):], f))

	def append(self, key, value):
		self.json_payload[key] = value

	def get(self):
		info.attach_info_to_request(self, extra_list=self.get_cookie("r4_active_list"))
		self.append("api_info", { "time": int(time.time()) })
		mobile = self.request.headers.get("User-Agent").lower().find("mobile") != -1 or self.request.headers.get("User-Agent").lower().find("android") != -1
		self.render("r4_index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					revision_number=config.build_number,
					jsfiles=self.jsfiles,
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"),
					locales=api.locale.locale_names_json,
					relays=config.public_relays_json[self.sid],
					stream_filename=config.get_station(self.sid, "stream_filename"),
					station_list=config.station_list_json,
					mobile=mobile)

@handle_url("/beta")
class BetaRedirect(tornado.web.RequestHandler):
	help_hidden = True

	def prepare(self):
		self.redirect("/beta/", permanent=True)

@handle_url("/beta/")
class BetaIndex(MainIndex):
	beta = True