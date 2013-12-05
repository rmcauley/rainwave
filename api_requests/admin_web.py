import time
import hashlib
import types

import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes
from api import sync_to_back

import api_requests.playlist
import api_requests.admin

from libs import config
from libs import db
from rainwave import event
from rainwave import playlist

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
		# [ ( "Link Title", "admin_url" ) ]
		for item in [ ("One Ups", "one_ups"), ("Cooldown", "cooldown"), ("Request Only Songs", "song_request_only") ]:
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

@handle_url("/admin/tools/one_ups")
class OneUpTool(api.web.PrettyPrintAPIMixin, api_requests.admin.GetOneUps):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s One Up Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s One-Up Tool</h2>" % config.station_id_friendly[self.sid])

		if 'one_ups' in self._output and type(self._output['one_ups']) == types.ListType and len(self._output['one_ups']) > 0:
			self.write("<ul>")
			for one_up in self._output['one_ups']:
				self.write("<li><div>")
				if not one_up['start'] or one_up['start'] == 0:
					self.write("ASAP")
				else:
					self.write(time.strftime("%a %b %d/%Y %H:%M %Z", time.localtime(one_up.start)))
				self.write(" -- <a onclick=\"window.top.call_api('admin/delete_one_up', { 'sched_id': %s });\">Delete</a></div>" % one_up['id'])
				self.write("<div>%s</div>" % one_up['songs'][0]['title'])
				self.write("<div>%s</div>" % one_up['songs'][0]['albums'][0]['name'])
				self.write("</li>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/cooldown")
class CooldownTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Cooldown Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s Cooldown Tool</h2>" % config.station_id_friendly[self.sid])
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/song_request_only")
class SongRequestOnlyTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Request Only Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s Request Only Tool</h2>" % config.station_id_friendly[self.sid])
		self.write("<p>Please match 'On Station' with 'With Songs From' when using this tool to ensure proper functioning.</p><p>The album screen will not refresh itself after making a change.</p>")

class AlbumList(api.web.HTMLRequest):
	admin_required = True
	allow_get = True
	fields = { "restrict": (fieldtypes.integer, True) }
	
	def get(self):
		self.write(self.render_string("bare_header.html", title="Album List"))
		self.write("<h2>%s Playlist</h2>" % config.station_id_friendly[self.get_argument('restrict')])
		self.write("<table>")
		for row in playlist.get_all_albums_list(self.get_argument('restrict'), self.user):
			self.write("<tr><td>%s</td>" % row['id'])
			self.write("<td onclick=\"window.location.href = '/admin/song_list/' + window.top.current_tool + '?sid=%s&id=%s';\" style='cursor: pointer;'>%s</td><td>" % (self.get_argument('restrict'), row['id'], row['name']))
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
	admin_required = True
	# fields are handled by AlbumHandler

	def get(self):
		self.write(self.render_string("bare_header.html", title="Song List"))
		self.write("<h2>%s</h2>" % self._output['album']['name'])
		self.write("<table>")
		for row in self._output['album']['songs']:
			self.write("<tr><td>%s</th><td>%s</td><td>" % (row['id'], row['title']))
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

@handle_url("/admin/album_list/one_ups")
class OneUpAlbumList(AlbumList):
	pass

@handle_url("/admin/album_list/song_request_only")
class SongRequestOnlyAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/one_ups")
class OneUpSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/add_one_up', { 'song_id': %s });\">Add OneUp</a></td>" % row['id'])

@handle_url("/admin/album_list/cooldown")
class CooldownAlbumList(AlbumList):
	def render_row_special(self, row):
		self.write("<td>x<input type='text' id='multiply_%s' style='width: 3em;' value='%s'></td>" % (row['id'], row['cool_multiply']))
		self.write("<td><input type='text' id='override_%s' style='width: 7em;' value='%s'></td>" % (row['id'], row['cool_override'] or ''))
		self.write("<td><a onclick=\"window.top.call_api('admin/set_album_cooldown', "
						"{ 'album_id': %s, 'multiply': document.getElementById('multiply_%s').value, 'override': document.getElementById('override_%s').value })\">Update</a>"
					"</td>" % (row['id'], row['id'], row['id']))
		self.write("<td><a onclick=\"window.top.call_api('admin/reset_album_cooldown', { 'album_id': %s })\">Reset</a>" % row['id'])

@handle_url("/admin/song_list/cooldown")
class CooldownSongList(SongList):
	def render_row_special(self, row):
		self.write("<td>x<input type='text' id='multiply_%s' style='width: 3em;' value='%s'></td>" % (row['id'], row['cool_multiply']))
		self.write("<td><input type='text' id='override_%s' style='width: 7em;' value='%s'></td>" % (row['id'], row['cool_override'] or ''))
		self.write("<td><a onclick=\"window.top.call_api('admin/set_song_cooldown', "
						"{ 'song_id': %s, 'multiply': document.getElementById('multiply_%s').value, 'override': document.getElementById('override_%s').value })\">Update</a>"
					"</td>" % (row['id'], row['id'], row['id']))
		self.write("<td><a onclick=\"window.top.call_api('admin/reset_song_cooldown', { 'song_id': %s })\">Reset</a>" % row['id'])

@handle_url("/admin/song_list/song_request_only")
class SongRequestOnlyList(SongList):
	def render_row_special(self, row):
		if row['request_only']:
			self.write("<td style='background: #880000;'><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': false })\">DISABLE</a>" % (row['id']))
		else:
			self.write("<td><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': true })\">enable</a>" % (row['id']))
