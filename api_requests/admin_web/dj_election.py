from libs import config
from libs import cache
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList

@handle_url("/admin/tools/dj_election")
class DJElectionTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s One Up Tool" % config.station_id_friendly[self.sid]))
		self.write("<h2>%s DJ Election Tool</h2>" % config.station_id_friendly[self.sid])
		self.write("<ul><li>Once committed, the election cannot be changed.</li>")
		self.write("<li>Pulling songs from other stations is possible and will not affect cooldown on the other station. (it will affect voting stats)")
		self.write("<li>Song order in elections is randomized for each user.</li>")
		self.write("</ul>")

		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			self.write("<p>No election started yet.</p>")
		else:
			self.write("<ul>")
			for song in songs:
				self.write("<li>%s<br>%s<br><a onclick=\"window.top.call_api('admin/remove_from_dj_election', { 'song_id': %s });\">Remove</a></li>"
					% (song.data['title'], song.albums[0].data['name'], song.id))
			self.write("</ul>")
			self.write("<a onclick=\"window.top.call_api('admin/commit_dj_election', { 'priority': false });\">Commit Behind Existing Elections</a><br><br>")
			self.write("<a onclick=\"window.top.call_api('admin/commit_dj_election', { 'priority': true });\">Commit In Front Of Everything</a>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/dj_election")
class DJElectionAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/dj_election")
class DJElectionSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/add_to_dj_election', { 'song_id': %s, 'song_sid': %s });\">queue up</a>" % (row['id'], self.sid))