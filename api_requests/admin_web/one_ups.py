import api.web
from api.server import handle_api_url
from api.server import handle_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList

from api_requests.admin.one_up import GetOneUps

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
				if not one_up['start'] or one_up['start'] == 0:
					self.write("ASAP")
				else:
					self.write(time.strftime("%a %b %d/%Y %H:%M %Z", time.localtime(one_up.start)))
				self.write(" -- <a onclick=\"window.top.call_api('admin/delete_one_up', { 'sched_id': %s });\">Delete</a></div>" % one_up['id'])
				self.write("<div>%s</div>" % one_up['songs'][0]['title'])
				self.write("<div>%s</div>" % one_up['songs'][0]['albums'][0]['name'])
				self.write("</li>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/one_ups")
class OneUpAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/one_ups")
class OneUpSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/add_one_up', { 'song_id': %s });\">Add OneUp</a></td>" % row['id'])