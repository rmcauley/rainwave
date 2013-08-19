import os
import json
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
	("admin_required", "admin", "User must be an administrator to use command."))

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
			self.write_property(prop[0], handler, prop[1])
		display_url = url
		if display_url.find("/api4/") == 0:
			display_url = display_url[6:]
		self.write("<td><a href='/api4/help%s'>%s</a></td></tr>" % (url, display_url))
	
	def get(self):
		self.write(self.render_string("basic_header.html", request=self, title="Rainwave API Documentation"))
		other_requests = {}
		self.write("<h2>Requests</h2>")
		self.write("<table class='help_legend'>")
		self.write("<tr><th colspan='8'>JSON API Requests</th></tr>")
		self.write("<tr><th>Allows GET<th>Auth Required</th><th>Station ID Required</th><th>Tune In Required</th><th>Login Required</th><th>DJs Only</th><th>Admins Only</th><th>URL</th></tr>")
		for url, handler in sorted(help_classes.items()):
			if issubclass(handler, api.web.APIHandler):
				if not handler.hidden and not handler.local_only:
					self.write_class_properties(url, handler)
			else:
				other_requests[url] = handler
		self.write("<tr><th colspan='8'>Other Requests</th></tr>")
		for url, handler in sorted(other_requests.items()):
			self.write_class_properties(url, handler)
		self.write("</table>")

		self.write("<h2>Making an API Request</h2>")
		self.write("<ul><li>The Rainwave 4 API handles all requests in the following format <b>http://rainwave.cc/api4/[request]</b>.</li>")
		self.write("<li>All data returned is JSON.</li>")
		self.write("<li>All data submitted is through POST form submission unless otherwise specified by 'Allow GET'.</li>")
		self.write("<li>Authentication keys and user IDs need to be obtained by the users at http://rainwave.cc/auth/</li>")
		self.write("<li>Unless otherwise indicated, authentication is required.</li>")
		self.write("</ul>")
		self.write("<h2>Station IDs</h2>")
		self.write("<ul>")
		for id in config.station_ids:
			self.write("<li>%s: %s</li>" % (id, config.station_id_friendly[id]))
		self.write("</ul>")
		self.write(self.render_string("basic_footer.html"))
		
class HelpRequest(tornado.web.RequestHandler):
	def get(self, url):
		url = "/" + url
		if not url in help_classes:
			self.send_error(404)
		klass = help_classes[url]
		self.write(self.render_string("basic_header.html", title="Rainwave API - %s" % url))
		self.write("<p>%s</p>" % klass.description)
		self.write("<ul>")
		for prop in url_properties:
			if getattr(klass, prop[0], False):
				self.write("<li>" + prop[2] + "</li>")
		self.write("</ul>")
		
		if getattr(klass, "fields", False):
			self.write("<h2>Fields</h2>")
			self.write("<table><tr><th>Field Name</th><th>Type</th><th>Required</th></tr>")
			if getattr(klass, "sid_required", False):
				self.write("<tr><td>sid</td><td>integer</td><td>Required</td></tr>")
			if getattr(klass, "auth_required", False):
				self.write("<tr><td>user_id</td><td>integer</td><td>Required</td></tr>")
				self.write("<tr><td>key</td><td>api_key</td><td>Required</td></tr>")
			else:
				self.write("<tr><td>user_id</td><td>integer</td><td>Optional</td></tr>")
				self.write("<tr><td>key</td><td>api_key</td><td>Optional</td></tr>")
			for field, field_attribs in klass.fields.iteritems():
				type_cast, required = field_attribs
				self.write("<tr><td>%s</td><td>%s</td>" % (field, type_cast.__name__))
				if required:
					self.write("<td>Required</td>")
				else:
					self.write("<td>Not required.</td>")
				self.write("</tr>")
			self.write("</table>")
		
		if (os.path.exists("api_tests/%s.json" % url)):
			self.write("<h2>Sample Output</h2>")
			self.write("<div class='json'>")
			json_file = open("api_tests/%s.json" % url)
			json_data = json.load(json_file)
			self.write(json.dumps(json_data, sort_keys=True, indent=4))
			json_file.close()
			self.write("</div>")
		
		self.write(self.render_string("basic_footer.html"))
