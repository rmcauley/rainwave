# coding=utf-8

import tornado.web
import tornado.escape
import time
import hashlib
import os

import api.web
import api.locale
from api.server import handle_url
from api_requests import info
from api import fieldtypes

from libs import config
from libs import cache
from libs import log
from libs import db
from libs import buildtools
from rainwave.user import User

jsfiles = buildtools.get_js_file_list_url()

@handle_url("/(?:index.html)?")
class MainIndex(api.web.HTMLRequest):
	description = "Main Rainwave page."

	def prepare(self):
		super(MainIndex, self).prepare()

		self.json_payload = []
		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key(self.request.remote_ip)
		self.user.data['sid'] = self.sid

	def append(self, key, value):
		self.json_payload.append({ key: value })

	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
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

		self.js4files = []
		for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/js4")):
			for file in files:
				self.js4files.append(os.path.join(root[root.find("static/js4"):], file))
		buildtools.bake_css()

	def append(self, key, value):
		self.json_payload[key] = value

	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.render("r4_index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					jsfiles=self.js4files,
					revision_number=config.build_number,
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"),
					locales=api.locale.locale_names_json)
