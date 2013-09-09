import time
import hashlib
import types

import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes

import api_requests.playlist

from libs import config
from libs import db

@handle_url("/admin/")
class AdminIndex(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.render("admin_frame.html", title="R4 Admin")

@handle_url("/admin/tool_list")
class ToolList(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Tool List"))
		self.write("<b>Do:</b><br />")
		for item in [ ("One Ups", "one_ups") ]:
			self.write("<a href=\"#\" onclick=\"top.current_tool = '%s'; top.change_screen();\">%s</a><br />" % (item[1], item[0]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/station_list")
class StationList(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>On station:</b><br>")
		for sid in config.station_ids:
			self.write("<a href=\"#\" onclick=\"top.current_station = %s; top.change_screen();\">%s</a><br />" % (sid, config.station_id_friendly[sid]))
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/restrict_songs")
class RestrictList(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Station List"))
		self.write("<b>With songs from:</b><br>")
		for sid in config.station_ids:
			self.write("<a href=\"#\" onclick=\"top.current_restriction = %s; top.change_screen();\">%s</a><br />" % (sid, config.station_id_friendly[sid]))
		self.write(self.render_string("basic_footer.html"))

@handle_api_url("admin/get_one_ups")
class GetOneUps(api.web.APIHandler):
	admin_required = True

	def post(self):
		self.append("one_ups", db.c.fetch_all("SELECT r4_schedule.*, song_title, album_name, username "
								"FROM r4_schedule "
									"JOIN r4_one_ups USING (sched_id) "
									"JOIN r4_songs USING (song_id) "
									"JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_schedule.sid = r4_song_sid.sid) "
									"JOIN r4_albums USING (album_id) "
									"LEFT JOIN phpbb_users ON (r4_schedule.sched_creator_user_id = phpbb_users.user_id)"
								"WHERE r4_schedule.sid = %s AND sched_used = FALSE ORDER BY sched_start",
								(self.sid,)))

@handle_url("/admin/tools/one_ups")
class OneUpTool(api.web.PrettyPrintAPIMixin, GetOneUps):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s One Up Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>One-Up Tool</h2>")

		if 'one_ups' in self._output and type(self._output['one_ups']) == types.ListType and len(self._output['one_ups']) > 0:
			self.write("<ul>")
			for one_up in self._output['one_ups']:
				self.write("<li><div>Scheduled:")
				if not one_up['sched_start'] or one_up['sched_start'] == 0:
					self.write("ASAP")
				else:
					self.write(time.strftime("%a %b %d/%Y %H:%M %Z", time.localtime(one_up['sched_start'])))
				self.write(" -- <a onclick=\"window.top.api_call('admin/one_up_delete');\">Delete</a></div>")
				self.write("<div>%s</div>" % one_up['song_title'])
				self.write("<div>%s</div>" % one_up['album_name'])
				self.write("</li>")


@handle_url("/admin/album_list/(one_ups)")
class AlbumList(api.web.PrettyPrintAPIMixin, api_requests.playlist.AllAlbumsHandler):
	fields = { "restrict": (fieldtypes.integer, True) }

	def get(self, tool):
		self.write(self.render_string("bare_header.html", title="Album List"))
		self.write("<table>")
		for row in self._output['all_albums']:
			self.write("<tr><td>%s</td><td>" % row['name'])
			if row['rating_user']:
				self.write(str(row['rating_user']))
			self.write("</td><td>")
			if row['fave']:
				self.write("Fave")
			self.write("</td>")
			self.render_row_special(row)
			self.write("</tr>")

	def render_row_special(self, row):
		pass

