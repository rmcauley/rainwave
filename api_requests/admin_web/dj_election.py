from libs import config
from libs import cache
import api.web
from api.server import handle_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList
from api import fieldtypes
from rainwave.events.election import Election
from libs import db

@handle_url("/admin/tools/dj_election")
class DJElectionTool(api.web.HTMLRequest):
	dj_preparation = True
	fields = { "sched_id": (fieldtypes.sched_id, False) }

	def get(self):
		self.write(self.render_string("bare_header.html", title="%s DJ Election Tool" % config.station_id_friendly[self.sid]))
		self.write("<script>\nwindow.top.refresh_all_screens = true;\n</script>")
		if self.get_argument("sched_id", None):
			self.write("<h2>%s Elections</h2>" % db.c.fetch_var("SELECT sched_name FROM r4_schedule WHERE sched_id = %s", (self.get_argument("sched_id"),)))
		else:
			self.write("<h2>%s DJ Election Tool</h2>" % config.station_id_friendly[self.sid])
		self.write("<ul><li>Once committed, the election cannot be edited.</li>")
		self.write("<li>Pulling songs from other stations is possible and will not affect cooldown on the other station. (it will affect voting stats on other stations)")
		self.write("<li>Song order in elections is randomized for each user - do not rely on the order.</li>")
		self.write("<li>Putting in 1 song will disable voting on the election.</li>")
		self.write("</ul><hr>")

		songs = cache.get_user(self.user.id, "dj_election")
		if not songs:
			self.write("<p>No election started yet.</p>")
		else:
			self.write("<ul>")
			for song in songs:
				self.write("<li>%s<br>%s<br><a onclick=\"window.top.call_api('admin/remove_from_dj_election', { 'song_id': %s });\">Remove</a></li>"
					% (song.data['title'], song.albums[0].data['name'], song.id))
			self.write("</ul>")
			if not self.get_argument("sched_id", None):
				self.write("<a onclick=\"window.top.call_api('admin/commit_dj_election');\">Commit to Queue</a>")
			else:
				self.write("<a onclick=\"window.top.call_api('admin/commit_dj_election?sched_id=%s');\">Add to DJ Block</a>" % (self.get_argument("sched_id"),))

		if self.get_argument("sched_id", None):
			self.write("<hr>")
			has_elections = False
			for election_id in db.c.fetch_list("SELECT elec_id FROM r4_elections WHERE sched_id = %s AND elec_used = FALSE ORDER BY elec_id", (self.get_argument("sched_id"),)):
				has_elections = True
				elec = Election.load_by_id(election_id)
				self.write("<ul>")
				for song in elec.songs:
					self.write("<li>%s (%s - %s)</li>" % (song.data['title'], song.albums[0].data['name'], song.artists[0].data['name']))
				self.write("<li><a onclick=\"window.top.call_api('admin/delete_election?elec_id=%s');\">(delete election)</a></li>" % elec.id)
				self.write("</ul>")
			if not has_elections:
				self.write("<div>No elections queued yet.</div>")

		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/dj_election")
class DJElectionAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/dj_election")
class DJElectionSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/add_to_dj_election', { 'song_id': %s, 'song_sid': %s });\">add to election</a>" % (row['id'], self.sid))