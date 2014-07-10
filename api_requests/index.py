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

	def prepare(self):
		host = self.request.headers.get('Host', None)
		if host == "game.rainwave.cc":
			self.sid = 1
		elif host == "ocr.rainwave.cc":
			self.sid = 2
		elif host == "covers.rainwave.cc":
			self.sid = 3
		elif host == "chiptune.rainwave.cc":
			self.sid = 4
		elif host == "all.rainwave.cc":
			self.sid = 5

		super(MainIndex, self).prepare()

		self.json_payload = []
		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key(self.request.remote_ip)
		self.user.data['sid'] = self.sid

	def append(self, key, value):
		self.json_payload.append({ key: value })

	def get(self):
		info.attach_info_to_request(self, all_lists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.render("index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					revision_number=config.build_number,
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"),
					locales=api.locale.locale_names_json)

@handle_url("/beta")
class BetaRedirect(tornado.web.RequestHandler):
	help_hidden = True

	def prepare(self):
		self.redirect("/beta/", permanent=True)

@handle_url("/beta/")
class R4Index(MainIndex):
	perks_required = True
	description = "The next version of the Rainwave UI."

	def prepare(self):
		if config.get("public_beta"):
			self.perks_required = False
		super(R4Index, self).prepare()
		self.json_payload = {}

		if config.get("web_developer_mode") or config.get("developer_mode") or config.get("test_mode"):
			buildtools.bake_css()
			buildtools.bake_beta_js()

	def append(self, key, value):
		self.json_payload[key] = value

	def get(self):
		info.attach_info_to_request(self, extra_list=self.get_cookie("r4_active_list"))
		self.append("api_info", { "time": int(time.time()) })
		self.render("r4_index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					revision_number=config.build_number,
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"),
					locales=api.locale.locale_names_json,
					relays=config.public_relays_json[self.sid],
					stream_filename=config.get_station(self.sid, "stream_filename"),
					station_list=config.station_list_json)
