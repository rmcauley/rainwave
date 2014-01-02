from libs import config
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList


@handle_url("/admin/tools/song_request_only")
class SongRequestOnlyTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s Request Only Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s Request Only Tool</h2>" % config.station_id_friendly[self.sid])
		self.write("<p>Please match 'On Station' with 'With Songs From' when using this tool to ensure proper functioning.</p><p>The album screen will not refresh itself after making a change.</p>")

@handle_url("/admin/album_list/song_request_only")
class SongRequestOnlyAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/song_request_only")
class SongRequestOnlyList(SongList):
	def render_row_special(self, row):
		if row['request_only']:
			self.write("<td style='background: #880000;'><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': false })\">DISABLE</a>" % (row['id']))
		else:
			self.write("<td><a onclick=\"window.top.call_api('admin/set_song_request_only', { 'song_id': %s, 'request_only': true })\">enable</a>" % (row['id']))