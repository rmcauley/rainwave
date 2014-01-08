import tornado.web

from api.web import APIHandler
from api.web import HTMLRequest
from api.web import PrettyPrintAPIMixin
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
from api.server import handle_api_html_url

from libs import config
from libs import cache
from libs import log
from libs import db

@handle_api_url("tip_jar")
class TipJarContents(APIHandler):
	return_name = "tip_jar"
	allow_get = True

	def post(self):
		self.append(self.return_name, db.c.fetch_all("SELECT donation_id AS id, donation_amount AS amount, donation_message AS message, "
										"CASE WHEN donation_private IS TRUE THEN 'Anonymous' ELSE username END AS name "
									"FROM r4_donations LEFT JOIN phpbb_users USING (user_id) "
									"ORDER BY donation_id DESC LIMIT 100"))

@handle_api_html_url("tip_jar")
class TipJarHTML(PrettyPrintAPIMixin, TipJarContents):
	def get(self):
		self.write(self.render_string("basic_header.html", title=self.locale.translate("tip_jar")))
		self.write("<p>%s</p>" % self.locale.translate("tip_jar_opener"))
		self.write("<ul><li>%s</li>" % self.locale.translate("tip_jar_instruction_1"))
		self.write("<li>%s</li>" % self.locale.translate("tip_jar_instruction_2"))
		self.write("<li>%s</li></ul>" % self.locale.translate("tip_jar_instruction_3"))
		self.write("<p>%s</p>" % self.locale.translate("tip_jar_opener_end"))
		super(TipJarHTML, self).get(write_header=False)

	def sort_keys(self, keys):
		return [ 'name', 'amount', 'message' ]