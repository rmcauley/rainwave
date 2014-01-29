import tornado.web
import json

import api.web
from api.server import handle_url
from api_requests import info
from api import fieldtypes
from api import locale

from libs import config
from libs import cache
from libs import log
from libs import db
from rainwave.user import User

@handle_url("/locale/")
class LocaleIndex(api.web.HTMLRequest):
	description = "Lists the currently available Rainwave locales/translations and how many lines are missing in them, as compared to the English master locale."

	def get(self):
		self.write(self.render_string("basic_header.html", title="Locale/Translation Information"))
		self.write("<p style='white-space: pre;'>")
		self.write(locale.locale_explanation)
		self.write("</p><hr>")

		self.write("<p>Translating a new language?  Start with the <a href='https://github.com/rmcauley/rainwave/blob/master/lang/en_MASTER.json'>Github Translation File Template</a>.</p>")

		self.write("<hr><p>The following languages exist, but may have missinglines: <ul>")
		for k, v in locale.translations.iteritems():
			if k != "en_CA":
				self.write("<li><a href='/locale/%s'>%s</a> - %s missing lines</a>" % (k, k, len(v.missing.keys())))
		self.write("</li>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/locale/(\w+)")
class LocaleMissingLines(api.web.HTMLRequest):
	description = "Lists all the missing lines in a locale/translation file."
	def get(self, request_locale):
		if not request_locale in locale.translations:
			raise tornado.web.HTTPError(404)

		self.write(self.render_string("basic_header.html", title="%s Missing Lines" % request_locale))
		self.write("<p><a href='https://github.com/rmcauley/rainwave/blob/master/lang/%s.json'>GitHub JSON File</a></p>" % request_locale)
		self.write("<p>The following lines are missing from this translation:</p>")

		self.write("<div class='json'>")
		self.write(json.dumps(locale.translations[request_locale].missing, sort_keys=True, indent=4, separators=(',', ': ')))
		self.write("</div>")
		self.write(self.render_string("basic_footer.html"))