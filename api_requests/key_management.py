import api.web
from api.server import handle_url
from api import fieldtypes

from libs import db

qr_service = "http://chart.apis.google.com/chart?cht=qr&chs=350x350&choe=ISO-8859-1&chl=%s"
mini_qr_service = "http://chart.apis.google.com/chart?cht=qr&chs=75x75&choe=ISO-8859-1&chld=L|0&chl=%s"

@handle_url("/keys/")
class KeyIndex(api.web.HTMLRequest):
	login_required = True
	description = "Used for management of API keys by users."
	sid_required = False

	def get(self):
		global qr_service
		global mini_qr_service

		self.write(self.render_string("basic_header.html", title=self.locale.translate("api_key_manager")))
		self.write("<p>%s: <bold>%s</bold></p>" % (self.locale.translate("your_numeric_user_id"), self.user.id))
		self.write("<table><tr><th>%s</th><th>%s</th><th>%s</th></tr>" %
				   (self.locale.translate("api_key"), self.locale.translate("delete"), self.locale.translate("qr_code")))
		for key in db.c.fetch_all("SELECT * FROM r4_api_keys WHERE user_id = %s", (self.user.id,)):
			url = "rw://%s:%s@rainwave.cc" % (self.user.id, key['api_key'])
			qr_url = qr_service % (url,)
			mini_qr_url = mini_qr_service % (url,)
			self.write("<tr><td>%s</td>" % key['api_key'])
			self.write("<td><a href=\"/keys/delete?delete_key=%s\">%s</a></td>" % (key['api_id'], self.locale.translate("delete")))
			self.write("<td><a href=\"%s\"><img src=\"%s\" class=\"qr\"></a></td>" % (qr_url, mini_qr_url))
			self.write("</tr>")
		self.write("<tr><td><a href=\"/keys/create\">%s</a></td><td>&nbsp;</td><td>&nbsp;</td></tr>" % (self.locale.translate("create_api_key")))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/keys/delete")
class KeyDelete(KeyIndex):
	fields = { "delete_key": (fieldtypes.integer, True) }

	def get(self):
		db.c.update("DELETE FROM r4_api_keys WHERE user_id = %s AND api_id = %s", (self.user.id, self.get_argument("delete_key")))
		self.user.get_all_api_keys()
		super(KeyDelete, self).get()

@handle_url("/keys/create")
class KeyCreate(KeyIndex):
	def get(self):
		self.user.generate_api_key()
		super(KeyCreate, self).get()
