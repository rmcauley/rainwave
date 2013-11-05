# coding=utf-8

import tornado.web
import tornado.escape
import time
import hashlib
import os

from api.server import handle_url
import api.web
from api_requests import info
from api import fieldtypes

from libs import config
from libs import cache
from libs import log
from libs import db
from libs import buildtools
from rainwave.user import User

jsfiles = []
for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/js")):
	for file in files:
		jsfiles.append(os.path.join(root[root.find("static/js"):], file))
jsfiles.sort()

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
		self.set_header("Content-Type", "text/plain")
		self.render("index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					revision_number=config.get("revision_number"),
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"))

@handle_url("/beta")
class BetaRedirect(tornado.web.RequestHandler):
	help_hidden = True
	
	def prepare(self):
		self.redirect("/beta/", permanent=True)

@handle_url("/beta/")
class BetaIndex(MainIndex):
	perks_required = True
	description = "Uses up-to-date, unbaked Javscript files to serve the site."

	def prepare(self):
		if config.get("public_beta"):
			self.perks_required = False
		super(BetaIndex, self).prepare()

	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.render("beta_index.html", request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					jsfiles=jsfiles,
					revision_number=config.get("revision_number"),
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"))
