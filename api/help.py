import json
import tornado.web
import api.web
from libs import config

help_classes = {}

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
		self.write_property("allow_get", handler, "GET")
		self.write_property("sid_required", handler, "sid")
		self.write_property("auth_required", handler, "auth")
		self.write_property("tunein_required", handler, "tunein")
		self.write_property("login_required", handler, "login")
		self.write_property("dj_required", handler, "dj")
		self.write_property("admin_required", handler, "admin")
		safe_url = url
		if safe_url.find("/api4/") == 0:
			safe_url = "api-" + safe_url[6:]
		self.write("<td><a href='/api/help/%s'>%s</a></td></tr>" % (url, safe_url))
	
	def get(self):
		write_help_header(self, "Rainwave API Documentation")
		other_requests = {}
		self.write("<h2>Requests</h2>")
		self.write("<table class='help_legend'>")
		self.write("<tr><th colspan='8'>JSON API Requests</th></tr>")
		self.write("<tr><th>Allows GET<th>Station ID Required</th><th>Auth Required</th><th>Tune In Required</th><th>Login Required</th><th>DJs Only</th><th>Admins Only</th><th>URL</th></tr>")
		for url, handler in sorted(help_classes.items()):
			if issubclass(handler, api.web.RequestHandler):
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
		write_help_footer(self)
		
class HelpRequest(tornado.web.RequestHandler):
	def get(self, url):
		if not url in help_classes:
			self.send_error(404)
		klass = help_classes[url]["class"]
		write_help_header(self, "Rainwave API - %s" % url)
		self.write("<p>%s</p>" % klass.description)
		self.write("<ul>")
		if klass.auth_required:
			self.write("<li>User ID and API key required.</li>")
		if klass.tunein_required:
			self.write("<li>User must be tuned in.</li>")
		if klass.login_required:
			self.write("<li>User must be registered.</li>")
		if klass.dj_required:
			self.write("<li>User must be a DJ.</li>")
		if klass.admin_required:
			self.write("<li>User must be an administrator.</li>")
		self.write("</ul>")
		
		self.write("<h2>Sample Output</h2>")
		self.write("<div class='json'>")
		json_file = open("api_tests/%s.json" % url)
		json_data = json.load(json_file)
		self.write(json.dumps(json_data, sort_keys=True, indent=4))
		json_file.close()
		self.write("</div>")
		
		write_help_footer(self)
		
def write_help_header(request, title):
	request.write("<?xml version='1.0' encoding='UTF-8'?>\n")
	request.write("<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Strict//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd'>\n")
	request.write("<html><head>")
	request.write("<meta http-equiv='Content-Type' content='application/xhtml+xml; charset=UTF-8' />")
	request.write("<title>%s</title>" % title)
	request.write("<style type='text/css'>")
	request.write("""
		body {
			overflow: auto;
			background: #000000;
			color: #FFFFFF;
		}

		h1, h2 {
			border-bottom: solid 1px #CE8300;
			color: #FFC96A;
		}

		div.indexlink {
			float: right;
			font-size: 1.2em;
			font-weight: bold;
		}

		a:link, a:visited {
			color: #AAFFFF;
		}

		a:link {
			text-decoration: none;
		}

		a:link:hover {
			text-decoration: underline;
		}

		pre, tt {
			background: #225;
		}

		pre {
			border: 1px dashed #55A;
			padding: .3em .3em .3em 1em;
		}

		div.warn, p.warn, div.ok, p.ok {
			padding: .3em .3em .3em 1em;
		}

		.warn {
			background: #300;
			border: 1px dashed #800;
		}

		.ok {
			background: #030;
			border: 1px dashed #080;
		}

		dt {
			font-weight: bold;
			border-bottom: solid 1px #3F667C;
		}

		dd {
			margin-left: 2em;
		}

		dd.note {
			margin-left: 3em;
			font-style: italic;
			color: #BBB;
		}

		dd.def {
			margin-left: .8em;
			border-bottom: 1px solid #444;
		}

		dd.return {
			margin-top: .5em;
		}
		
		tr:hover td {
			background: #111144;
		}
		
		th {
			background: none repeat scroll 0 0 #4444AA;
			color: #FFFFFF;
			text-align: left;
		}
		
		td, th {
			border-bottom: 1px solid #BBB;
			border-left: 1px solid #444;
			padding: 1px 5px;
		}
		
		td.requirement {
			text-align: center;
		}
		
		.json {
			font-family: monospace;
			white-space: pre;
			background: none repeat scroll 0 0 #111144;
			border: 1px dashed #4444AA;
			padding: .2em .4em;
		}
	""")
	request.write("</style><body><h1>%s</h1>" % title)

def write_help_footer(request):
	request.write("</body></html>")
