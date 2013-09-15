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
from rainwave import event

# This entire module is hastily thrown together and discards many of the standard API features
# such as locale translation, obeying HTML standards, and many times the disconnection between
# data, presentation, and so on.  It's for admins.  Not users.  QA and snazzy interfaces need not apply.
# It only needs to work.

@handle_url("/admin/")
class AdminIndex(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.render("admin_frame.html", title="R4 Admin", api_url=config.get("api_external_url_prefix"), user_id=self.user.id, api_key=self.user.ensure_api_key())

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
		self.append("one_ups", db.c.fetch_all("SELECT r4_schedule.*, r4_one_ups.song_id, song_title, album_name, username "
								"FROM r4_schedule "
									"JOIN r4_one_ups USING (sched_id) "
									"JOIN r4_songs USING (song_id) "
									"JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_schedule.sid = r4_song_sid.sid) "
									"JOIN r4_albums USING (album_id) "
									"LEFT JOIN phpbb_users ON (r4_schedule.sched_creator_user_id = phpbb_users.user_id)"
								"WHERE r4_schedule.sid = %s AND sched_used = FALSE ORDER BY sched_start",
								(self.sid,)))

@handle_api_url("admin/add_one_up")
class AddOneUp(api.web.APIHandler):
	admin_required = True
	fields = { "song_id": (fieldtypes.song_id, True) }

	def post(self):
		e = event.OneUp.create(self.sid, 0, self.get_argument("song_id"))
		self.append(self.return_name, { "success": True, "sched_id": e.id, "text": "OneUp Added" })

@handle_api_url("admin/delete_one_up")
class DeleteOneUp(api.web.APIHandler):
	admin_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def post(self):
		e = event.OneUp.load_by_id(self.get_argument("sched_id"))
		if e.used:
			raise Exception("OneUp already used.")
		print e.id
		r = db.c.update("DELETE FROM r4_schedule WHERE sched_id = %s", (e.id,))
		if r:
			self.append(self.return_name, { "success": True, "text": "OneUp deleted." })
		else:
			self.append(self.return_name, { "success": False, "text": "OneUp not deleted." })


@handle_url("/admin/tools/one_ups")
class OneUpTool(api.web.PrettyPrintAPIMixin, GetOneUps):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s One Up Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s One-Up Tool</h2>" % config.station_id_friendly[self.sid])

		if 'one_ups' in self._output and type(self._output['one_ups']) == types.ListType and len(self._output['one_ups']) > 0:
			self.write("<ul>")
			for one_up in self._output['one_ups']:
				self.write("<li><div>")
				if not one_up['sched_start'] or one_up['sched_start'] == 0:
					self.write("ASAP")
				else:
					self.write(time.strftime("%a %b %d/%Y %H:%M %Z", time.localtime(one_up['sched_start'])))
				self.write(" -- <a onclick=\"window.top.call_api('admin/delete_one_up', { 'sched_id': %s });\">Delete</a></div>" % one_up['sched_id'])
				self.write("<div>%s</div>" % one_up['song_title'])
				self.write("<div>%s</div>" % one_up['album_name'])
				self.write("</li>")

@handle_url("/admin/album_list/one_ups")
class AlbumList(api.web.PrettyPrintAPIMixin, api_requests.playlist.AllAlbumsHandler):
	fields = { "restrict": (fieldtypes.integer, True) }

	def get(self):
		self.write(self.render_string("bare_header.html", title="Album List"))
		self.write("<table>")
		for row in self._output['all_albums']:
			self.write("<tr onclick=\"window.location.href = '/admin/song_list/' + window.top.current_tool + '?id=%s';\"><td>%s</td><td>" % (row['id'], row['name']))
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

class SongList(api.web.PrettyPrintAPIMixin, api_requests.playlist.AlbumHandler):
	# fields are handled by AlbumHandler

	def get(self):
		self.write(self.render_string("bare_header.html", title="Song List"))
		self.write("<h2>%s</h2>" % self._output['album']['name'])
		self.write("<table>")
		for row in self._output['album']['songs']:
			self.write("<tr><td>%s</td><td>" % row['title'])
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

@handle_url("/admin/song_list/one_ups")
class OneUpSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/add_one_up', { 'song_id': %s });\">Add OneUp</a></td>" % row['id'])
