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
class MainIndex(api.web.HTMLRequest):
	def get_user_locale(self):
		global translations
		locale = super(MainIndex, self).get_user_locale()
		self.site_description = translations['en_CA'][self.sid]
		if locale in translations:
			if self.sid in translations[locale]:
				self.site_description = translations[locale][self.sid]
			return locale
		else:
			return "en_CA"

	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.set_header("Content-Type", "text/plain")
		self.render("index.html", request=self, revision_number=config.get("revision_number"), api_url=config.get("api_external_url_prefix"), cookie_domain=config.get("cookie_domain"))

@handle_url("/beta/?")
class BetaIndex(MainIndex):
	perks_required = True
	
	def get(self):
		info.attach_info_to_request(self, playlist=True, artists=True)
		self.append("api_info", { "time": int(time.time()) })
		self.render("beta_index.html", request=self, jsfiles=jsfiles, revision_number=config.get("revision_number"), api_url=config.get("api_external_url_prefix"), cookie_domain=config.get("cookie_domain"))
