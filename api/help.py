import tornado.web
import api.web
from libs import config

help_classes = {}
url_properties = ( ("allow_get", "GET", "Allows HTTP GET requests in addition to POST requests."),
	("auth_required", "auth", "User ID and API Key required as part of form submission."),
	("sid_required", "sid", "Station ID required as part of form submission."),
	("tunein_required", "tunein", "User is required to be tuned in to use command."),
	("login_required", "login", "User must be logged in to a registered account to use command."),
	("dj_required", "dj", "User must be the active DJ for the station to use command."),
	("admin_required", "admin", "User must be an administrator to use command."),
	("pagination", "pagination", "Request can be paginated using 'per_page' and 'page_start' fields."))
section_order = ( "Core JSON", "HTML Pages", "Statistic HTML", "Admin JSON", "Admin HTML", "Other" )
sections = { "Core JSON": {},
			"HTML Pages": {},
			"Statistic HTML": {},
			"Admin JSON": {},
			"Admin HTML" : {},
			"Other": {} }

def sectionize_requests():
	for url, handler in help_classes.items():
		if handler.help_hidden:
			pass
		elif handler.local_only:
			if config.get("developer_mode"):
				sections["Other"][url] = handler
		elif issubclass(handler, api.web.PrettyPrintAPIMixin):
			if handler.admin_required or handler.dj_required or handler.dj_preparation:
				sections["Admin HTML"][url] = handler
			else:
				sections["Statistic HTML"][url] = handler
		elif issubclass(handler, api.web.HTMLRequest):
			if handler.admin_required or handler.dj_required or handler.dj_preparation:
				sections["Admin HTML"][url] = handler
			else:
				sections["HTML Pages"][url] = handler
		elif issubclass(handler, api.web.APIHandler):
			if handler.admin_required or handler.dj_required or handler.dj_preparation:
				sections["Admin JSON"][url] = handler
			else:
				sections["Core JSON"][url] = handler
		else:
			sections["Other"][url] = handler

def add_help_class(klass, url):
	help_classes[url] = klass

class IndexRequest(tornado.web.RequestHandler):
	def write_property(self, name, handler, to_print):
		if getattr(handler, name, False):
			self.write("<td class='%s requirement'>%s</td>" % (name, to_print))
		else:
			self.write("<td class='requirement'>&nbsp;</td>")

	def write_class_properties(self, url, handler):
		self.write("<tr>")
		for prop in url_properties:
			if prop[0] == "auth_required" and getattr(handler, "phpbb_auth", False):
				self.write("<td class='auth requirement'>phpBB</td>")
			elif prop[0] == "auth_required" and getattr(handler, "auth_required", False):
				self.write("<td class='auth requirement'>API key</td>")
			elif prop[0] == "dj_required" and not getattr(handler, "admin_required", False) and (getattr(handler, "dj_required", False) or getattr(handler, "dj_preparation", False)):
				self.write("<td class='dj requirement'>dj</td>")
			else:
				self.write_property(prop[0], handler, prop[1])
		display_url = url
		self.write("<td><a href='/api4/help%s'>%s</a></td>" % (url, display_url))
		if (issubclass(handler, api.web.HTMLRequest) or issubclass(handler, api.web.PrettyPrintAPIMixin)) and url.find("(") == -1:
			self.write("<td><a href='%s'>Link</a></td>" % url)
		else:
			self.write("<td>&nbsp;</td>")
		self.write("</tr>")

	def get(self):
		self.write(self.render_string("basic_header.html", request=self, title="Rainwave API Documentation"))

		self.write("<h2>Requests</h2>")
		self.write("<table class='help_legend'>")
		for section in section_order:
			self.write("<tr><th colspan='10'>%s</th></tr>" % section)
			self.write("<tr><th>Allows GET<th>Auth Required</th><th>Station ID Required</th><th>Tune In Required</th><th>Login Required</th><th>DJ</th><th>Admin</th><th>Pagination</th><th>URL</th><th>Link</th></tr>")
			for url, handler in sorted(sections[section].items()):
				self.write_class_properties(url, handler)
		self.write("</table>")
		self.write("<h2>Making an API Request</h2>")
		self.write("<ul><li>The Rainwave 4 API endpoints are all: <b>http://rainwave.cc/api4/[request]</b>.</li>")
		self.write("<li>All endpoints respond to POST.  Some allow GET requests, some do not.</li>")
		self.write("<li>Authentication keys and user IDs need to be obtained by the users at http://rainwave.cc/keys/</li>")
		self.write("<li>Authentication is provided by 'user_id' and 'key' form data.</li>")
		self.write("<li>Desired station for the request must be specified by 'sid' form data, using the corresponding Station ID below.</li>")
		self.write("</ul>")
		self.write("<h2>Station ID For 'sid' Argument</h2>")
		self.write("<ul>")
		for sid in config.station_ids:
			self.write("<li>%s: %s</li>" % (sid, config.station_id_friendly[sid]))
		self.write("</ul>")
		self.write(self.render_string("basic_footer.html"))

class HelpRequest(tornado.web.RequestHandler):
	def get(self, url):		#pylint: disable=W0221
		url = "/" + url
		if not url in help_classes:
			self.send_error(404)
		klass = help_classes[url]
		self.write(self.render_string("basic_header.html", title="Rainwave API - %s" % url))
		self.write("<p>%s</p>" % klass.description)
		self.write("<ul>")
		for prop in url_properties:
			if prop[0] == "auth_required" and getattr(klass, "phpbb_auth", False):
				self.write("<li>User must be requesting from Rainwave.cc and logged in to the Rainwave.cc forum system.")
			elif getattr(klass, prop[0], False):
				self.write("<li>" + prop[2] + "</li>")
		self.write("</ul>")

		self.write("<h2>Fields</h2>")
		self.write("<table><tr><th>Field Name</th><th>Type</th><th>Required</th></tr>")
		if getattr(klass, "auth_required", False):
			if getattr(klass, "admin_required", False):
				self.write("<tr><td>user_id</td><td>integer</td><td>Required, must be an administrator.</td></tr>")
			elif getattr(klass, "login_required", False):
				self.write("<tr><td>user_id</td><td>integer</td><td>Required, registered users only. (user_id > 1)</td></tr>")
			else:
				self.write("<tr><td>user_id</td><td>integer</td><td>Required, anonymous users OK. (user_id == 1).</td></tr>")
			self.write("<tr><td>key</td><td>api_key</td><td>Required</td></tr>")
		else:
			self.write("<tr><td>user_id</td><td>integer</td><td>Optional</td></tr>")
			self.write("<tr><td>key</td><td>api_key</td><td>Optional</td></tr>")
		if getattr(klass, "sid_required", False):
			self.write("<tr><td>sid</td><td>integer</td><td>Required</td></tr>")
		if getattr(klass, "pagination", False) and not "per_page" in klass.fields:
			self.write("<tr><td>per_page</td><td>integer</td><td>Optional, default 100</td></tr>")
			self.write("<tr><td>page_start</td><td>integer</td><td>Optional, default 0</td></tr>")
		for field, field_attribs in klass.fields.iteritems():
			type_cast, required = field_attribs
			self.write("<tr><td>%s</td><td>%s</td>" % (field, type_cast.__name__))
			if required:
				self.write("<td>Required</td>")
			else:
				self.write("<td>Not required.</td>")
			self.write("</tr>")
		self.write("</table>")

		# if (os.path.exists("api_tests/%s.json" % url)):
		# 	self.write("<h2>Sample Output</h2>")
		# 	self.write("<div class='json'>")
		# 	json_file = open("api_tests/%s.json" % url)
		# 	json_data = json.load(json_file)
		# 	self.write(json.dumps(json_data, sort_keys=True, indent=4))
		# 	json_file.close()
		# 	self.write("</div>")

		self.write(self.render_string("basic_footer.html"))
