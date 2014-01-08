import time
import calendar
from libs import config
from libs import db
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api import fieldtypes
import api_requests.playlist

def write_html_time_form(request, html_id, at_time = None):
	current_time = calendar.timegm(time.gmtime())
	if not at_time:
		at_time = current_time
	request.write(request.render_string("admin_time_select.html", at_time=at_time, html_id=html_id))

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
		for item in [ ("Scan Results", "scan_results"), ("Power Hours", "power_hours"), ("DJ Elections", "dj_election"), ("Cooldown", "cooldown"), ("Request Only Songs", "song_request_only"), ("Donations", "donations") ]:
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

class AlbumList(api.web.HTMLRequest):
	admin_required = True
	allow_get = True
	fields = { "restrict": (fieldtypes.sid, True) }
	
	def get(self):
		self.write(self.render_string("bare_header.html", title="Album List"))
		self.write("<h2>%s Playlist</h2>" % config.station_id_friendly[self.get_argument('restrict')])
		self.write("<table>")
		albums = db.c.fetch_all("SELECT r4_albums.album_id AS id, album_name AS name, album_name_searchable AS name_searchable, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, album_fave AS fave, album_rating_user AS rating_user, album_cool_multiply AS cool_multiply, album_cool_override AS cool_override "
			"FROM r4_albums "
			"JOIN r4_album_sid USING (album_id) "
			"LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND user_id = %s) "
			"WHERE r4_album_sid.sid = %s "
			"ORDER BY album_name",
			(self.user.id, self.get_argument("restrict")))
		for row in albums:
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
		self.write("<h2>%s (%s)</h2>" % (self._output['album']['name'], config.station_id_friendly[self.sid]))
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