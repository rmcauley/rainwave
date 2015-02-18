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
from libs import db
from rainwave.user import User
from rainwave.events.event import BaseProducer

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
	page_template = "r4_index.html"

	def prepare(self):
		super(MainIndex, self).prepare()
		self.json_payload = {}
		self.jsfiles = None

		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key()

		if self.beta or config.get("web_developer_mode") or config.get("developer_mode") or config.get("test_mode"):
			buildtools.bake_beta_css()
			self.jsfiles = []
			for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/js4")):	#pylint: disable=W0612
				for f in files:
					if f.endswith(".js"):
						self.jsfiles.append(os.path.join(root[root.find("static/js4"):], f))

	def append(self, key, value):
		self.json_payload[key] = value

	def get(self):
		self.mobile = self.request.headers.get("User-Agent").lower().find("mobile") != -1 or self.request.headers.get("User-Agent").lower().find("android") != -1
		info.attach_info_to_request(self, extra_list=self.get_cookie("r4_active_list"))
		self.append("api_info", { "time": int(time.time()) })
		self.render(self.page_template, request=self,
					site_description=self.locale.translate("station_description_id_%s" % self.sid),
					revision_number=config.build_number,
					jsfiles=self.jsfiles,
					api_url=config.get("api_external_url_prefix"),
					cookie_domain=config.get("cookie_domain"),
					locales=api.locale.locale_names_json,
					relays=config.public_relays_json[self.sid],
					stream_filename=config.get_station(self.sid, "stream_filename"),
					station_list=config.station_list_json,
					apple_home_screen_icon=config.get_station(self.sid, "apple_home_screen_icon"),
					mobile=self.mobile)

@handle_url("/beta")
class BetaRedirect(tornado.web.RequestHandler):
	help_hidden = True

	def prepare(self):
		self.redirect("/beta/", permanent=True)

@handle_url("/beta/")
class BetaIndex(MainIndex):
	beta = True

	def prepare(self):
		if not config.get("public_beta"):
			self.perks_required = True
		return super(BetaIndex, self).prepare()

@handle_url("/admin2/")
class Admin2Index(MainIndex):
	page_template = "r4_admin.html"
	dj_required = True

	def get(self):
		producers = []
		if self.user.is_admin():
			for sched_id in db.c.fetch_list("SELECT sched_id FROM r4_schedule WHERE sched_used = 0"):
				producers.append(BaseProducer.load_producer_by_id(sched_id).to_dict())
		else:
			for sched_id in db.c.fetch_list("SELECT sched_id FROM r4_schedule WHERE sched_dj_user_id = %s", (self.user.id,)):
				producers.append(BaseProducer.load_producer_by_id(sched_id).to_dict())
		return super(Admin2Index, self).get()