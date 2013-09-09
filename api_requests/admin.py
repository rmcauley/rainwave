import time
import hashlib

import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException

from libs import config
from libs import db

@handle_url("/admin/")
class AdminIndex(api.web.HTMLRequest):
	login_required = True
	admin_required = True

	def get(self):
		self.render("admin_frame.html", title="R4 Admin")

@handle_url("/admin/tool_list")
class ToolList(AdminIndex):
	def get(self):
		self.write(self.render_string("bare_header.html", title="Tool List"))
		self.write("<b>Do:</b><br />")
		for item in [ ("One Ups", "one_ups") ]:
			self.write("<a href=\"#\" onclick=\"top.current_tool = '%s'; top.change_screen();\">%s</a><br />" % (item[1], item[0]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/station_list")
class StationList(AdminIndex):
	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>On station:</b><br>")
		for sid in config.station_ids:
			self.write("<a href=\"#\" onclick=\"top.current_station = %s; top.change_screen();\">%s</a><br />" % (sid, config.station_id_friendly[sid]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/restrict_songs")
class RestrictList(AdminIndex):
	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>With songs from:</b><br>")
		for sid in config.station_ids:
			self.write("<a href=\"#\" onclick=\"top.current_restriction = %s; top.change_screen();\">%s</a><br />" % (sid, config.station_id_friendly[sid]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/one_ups")
class OneUpTool(AdminIndex):
	def get(self):
		self.write("One Up Tool")

@handle_url("/admin/album_list/(one_ups)")
class AlbumList(AdminIndex):
	def get(self, tool):
		self.write(tool)

	def render_row(self):
		pass

	def render_row_special(self):
		pass

