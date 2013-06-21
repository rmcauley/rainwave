# coding=utf-8

import tornado.web
import tornado.escape
import time
import hashlib
import os

from api.server import handle_url
from api.web import RequestHandler
from api_requests import info
from api import fieldtypes

from libs import config
from libs import cache
from libs import log
from libs import db
from libs import buildtools
from rainwave.user import User

translations = {
	"en_CA": {
		1: "Streaming Video Game Music Radio.  Vote for the song you want to hear!",
		2: "OverClocked Remix Radio.  Vote for your favourite remixes!",
		3: "Video game cover bands and remixes.  Vote for your favourite artists!",
		4: "Streaming original game chiptunes.  Vote for the songs you want to hear!",
		5: "Streaming game music and remixes.  Vote for the songs you want to hear!"
	},
	"de_DE": {
		1: u"Streaming Video Game Music Radio.  Stimme für den Song ab den du hören willst!",
		2: u"OverClocked Remix Radio.  Stimme für deine lieblings remixes ab!",
		3: u"Video game cover bands and remixes.  Stimme für deine lieblings Interpreten ab!",
		4: u"Streaming original game chiptunes.  Stimme für den Song ab den du hören willst!",
		5: u"Streaming game music and remixes.  Stimme für den Song ab den du hören willst!"
	},
	"es_CL": {
		1: u"Radio por Internet de Música de Videojuegos.  ¡Vota por las canciones que quieres escuchar!",
		2: u"La Radio de OverClocked Remix.  ¡Vota por tus remixes favoritos!",
		3: u"Covers y Remixes de Música de Videojuegos.  ¡Vota por tus artistas favoritos!",
		4: u"Transmitiendo chiptunes originales de videojuegos.  ¡Vota por las canciones que quieres escuchar!",
		5: u"Transmitiendo música original y remixes de videojuegos.  ¡Vota por las canciones que quieres escuchar!"
	},
	"fi_FI": {
		1: u"Videopelimusiikkia soittava internet-radio.  Äänestä haluamaasi kappaletta!",
		2: u"OverClocked Remix internet-radio.  Äänestä haluamaasi remixiä!",
		3: u"Videopelimusiikkia soittavia coverbändejä ja pelimusiikkiremixejä.  Äänestä suosikkiesittäjääsi!",
		4: u"Videopelien chiptune-tyylistä musiikkia soittava internet-radio.  Äänestä haluamiasi kappaleita!",
		5: u"Videopelimusiikkia ja niiden remixejä soittava internet-radio.  Äänestä haluamiasi kappaleita!"
	},
	"nl_NL": {
		1: "Luister Video Game Muziek Radio. Stem op het nummer dat je wilt horen!",
		2: "OverClocked Remix Radip. Stem op jouw favoriete remixen!",
		3: "Video game cover bands en remixen. Stem op jouw favoriete artiesten!"
	},
	"pt_BR": {
		1: u"Rádio Online de Músicas de Video Game.  Vote nas músicas que quiser ouvir!",
		2: u"Rádio OverClocked Remix.  Vote nos seus remixes favoritos!",
		3: u"Bandas cover e remixes de Video Game.  Vote nos seus artistas favoritos!",
		4: u"Chiptunes Originais de Videgame.  Vote nas músicas que quiser ouvir!",
		5: u"Músicas e Remixes de Videogame.  Vote nas músicas que quiser ouvir!"
	},
	"se_SE": {}
}

jsfiles = []
for root, subdirs, files in os.walk(os.path.join(os.path.dirname(__file__), "../static/js")):
	for file in files:
		jsfiles.append(os.path.join(root[root.find("static/js"):], file))
jsfiles.sort()

@handle_url("/(?:index.html)?")
class MainIndex(tornado.web.RequestHandler):
	def get_user_locale(self):
		global translations
		locale = self.get_cookie("r4lang", "en_CA")
		self.site_description = translations['en_CA'][self.sid]
		if locale in translations:
			if self.sid in translations[locale]:
				self.site_description = translations[locale][self.sid]
			return locale
		else:
			return "en_CA"

	def prepare(self):
		self.json_payload = []
		self.sid = fieldtypes.integer(self.get_cookie("r4sid", "1"))
		if not self.sid:
			self.sid = 1
		
		for possible_sid in config.station_ids:
			if self.request.host == config.get_station(possible_sid, "host"):
				self.sid = possible_sid
				break

		self.set_cookie("r4sid", str(self.sid), expires_days=365, domain=config.get("cookie_domain"))
		phpbb_cookie_name = config.get("phpbb_cookie_name")
		self.user = None
		if not fieldtypes.integer(self.get_cookie(phpbb_cookie_name + "u", "")):
			self.user = User(1)
		else:
			user_id = int(self.get_cookie(phpbb_cookie_name + "u"))
			if self.get_cookie(phpbb_cookie_name + "sid"):
				session_id = db.c_old.fetch_var("SELECT session_id FROM phpbb_sessions WHERE session_id = %s AND session_user_id = %s", (self.get_cookie(phpbb_cookie_name + "sid"), user_id))
				if session_id:
					db.c_old.update("UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s", (int(time.time()), "rainwave", session_id))
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)

			if not self.user and self.get_cookie(phpbb_cookie_name + "k"):
				can_login = db.c_old.fetch_var("SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s", (hashlib.md5(self.get_cookie(phpbb_cookie_name + "k")).hexdigest(), user_id))
				if can_login == 1:
					self.user = User(user_id)
					self.user.authorize(self.sid, None, None, True)

		if not self.user:
			self.user = User(1)
		self.user.ensure_api_key(self.request.remote_ip)
		self.user.data['sid'] = self.sid

	# this is so that get_info can be called, makes us compatible with the custom web handler used elsewhere in RW
	def append(self, key, value):
		self.json_payload.append({ key: value })

	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.set_header("Content-Type", "text/plain")
		self.render("index.html", request=self, revision_number=config.get("revision_number"), api_url=config.get("api_external_url_prefix"), cookie_domain=config.get("cookie_domain"))

@handle_url("/beta/?")
class BetaIndex(MainIndex):
	def get(self):
		if not config.get("developer_mode") and self.user.data['_group_id'] not in (5, 4, 8, 12, 15, 14, 17):
			self.send_error(403)
		else:
			info.attach_info_to_request(self, playlist=True, artists=True)
			self.append("api_info", { "time": int(time.time()) })
			self.render("beta_index.html", request=self, jsfiles=jsfiles, revision_number=config.get("revision_number"), api_url=config.get("api_external_url_prefix"), cookie_domain=config.get("cookie_domain"))
