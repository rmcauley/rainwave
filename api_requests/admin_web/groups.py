from libs import config
from libs import cache
from libs import db

import api.web
import api.fieldtypes
from api.server import handle_url
from api.server import handle_api_url
from api_requests.admin_web.index import AlbumList
from api_requests.admin_web.index import SongList

from rainwave.playlist import Song, Album, SongGroup

@handle_api_url("admin/associate_groups_add_song")
class AssociateGroupAddSong(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "song_id": (api.fieldtypes.song_id, True) }

	def post(self):
		songs = cache.get_user(self.user, "admin_associate_groups_songs")
		if not songs:
			songs = []
		songs.append(self.get_argument("song_id"))
		cache.set_user(self.user, "admin_associate_groups_songs", songs)
		self.append_standard("song_added")

@handle_api_url("admin/associate_groups_add_album")
class AssociateGroupAddAlbum(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "album_id": (api.fieldtypes.album_id, True), "album_sid": (api.fieldtypes.sid, True) }

	def post(self):
		albums = cache.get_user(self.user, "admin_associate_groups_albums")
		if not albums:
			albums = []
		albums.append((self.get_argument("album_id"), self.get_argument("album_sid")))
		cache.set_user(self.user, "admin_associate_groups_albums", albums)
		self.append_standard("album_added")

@handle_url("/admin/tools/associate_groups_finish/(\d+)")
class AssociateGroupToolFinish(api.web.HTMLRequest):
	admin_required = True
	sid_required = False

	def get(self, group_id):	#pylint: disable=W0221
		group = SongGroup.load_from_id(group_id)
		songs = cache.get_user(self.user, "admin_associate_groups_songs") or []
		cache.set_user(self.user, "admin_associate_groups_songs", [])
		for song_id in songs:
			group.associate_song_id(song_id)
		albums = cache.get_user(self.user, "admin_associate_groups_albums") or []
		cache.set_user(self.user, "admin_associate_groups_albums", [])
		for album_set in albums:
			album = Album.load_from_id_with_songs(album_set[0], album_set[1])
			for song in album.data['songs']:
				group.associate_song_id(song['id'])
		self.write(self.render_string("bare_header.html", title="Added Groups"))
		self.write("<p>Now associated.</p><p><a href='/admin/tools/associate_groups'>Start over.</a></p>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/associate_groups_cache_reset")
class AssociateGroupCacheReset(api.web.HTMLRequest):
	admin_required = True
	sid_required = False

	def get(self):
		cache.set_user(self.user, "admin_associate_groups_songs", [])
		cache.set_user(self.user, "admin_associate_groups_albums", [])
		self.write(self.render_string("bare_header.html", title="Added Groups"))
		self.write("<p>Reset.</p><p><a href='/admin/tools/associate_groups'>Start over.</a></p>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/associate_groups")
class AssociateGroupTool(api.web.HTMLRequest):
	admin_required = True
	sid_required = False

	def get(self):
		self.write(self.render_string("bare_header.html", title="Adding Groups"))
		self.write("<h2>Associating Groups</h2>")
		self.write("<h3>These Songs:</h3><ul>")
		songs = cache.get_user(self.user, "admin_associate_groups_songs") or []
		for song_id in songs:
			song = Song.load_from_id(song_id)
			self.write("<li>%s</li>" % song.data['title'])
		self.write("</ul><h3>Songs In These Albums:</h3><ul>")
		albums = cache.get_user(self.user, "admin_associate_groups_albums") or []
		for album_set in albums:
			album = Album.load_from_id(album_set[0])
			self.write("<li>%s (%s)</li>" % (album.data['name'], config.station_id_friendly[album_set[1]]))
		self.write("</ul><select id='associate_group_id'>")
		for row in db.c.fetch_all("SELECT group_id, group_name FROM r4_groups ORDER BY group_name"):
			self.write("<option value='%s'>%s</option>" % (row['group_id'], row['group_name']))
		self.write("</select><br />")
		self.write("<button onclick=\"window.location.href='/admin/tools/associate_groups_finish/' + document.getElementById('associate_group_id').value\">Associate</button>")
		self.write("<br /><br /><a href='/admin/tools/associate_groups_cache_reset'>Reset the list above.</a>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/associate_groups")
class AssociateGroupAlbumList(AlbumList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/associate_groups_add_album', { 'album_id': %s, 'album_sid': window.top.current_restriction });\">Add To List</a>" % row['id'])

@handle_url("/admin/song_list/associate_groups")
class AssociateGroupSongList(SongList):
	def render_row_special(self, row):
		self.write("<td><a onclick=\"window.top.call_api('admin/associate_groups_add_song', { 'song_id': %s });\">Add to List</a></td>" % row['id'])
		self.write("<td>")
		for group in db.c.fetch_all("SELECT r4_groups.group_id, group_name, group_is_tag FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s ORDER BY group_is_tag DESC, group_name", (row['id'],)):
			if not group['group_is_tag']:
				self.write("<a class='group_name group_delete' onclick=\"window.top.call_api('admin/remove_group_from_song', { 'song_id': %s, 'group_id': %s });\">%s (X)</a> " % (row['id'], group['group_id'], group['group_name']))
			else:
				self.write("<span class='group_name'>%s</span>" % (group['group_name'],))
		self.write("</td>")

@handle_url("/admin/tools/group_edit")
class GroupEditTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Group Editing"))
		self.write("<h2>Group Editing</h2>")
		self.write("<p>The station you select in the frames above this have no bearing here.</p>")
		self.write("<p>-- todo: let you add new groups here --</p>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/group_edit")
class GroupEditGroupList(api.web.HTMLRequest):
	admin_required = True
	allow_get = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Group List"))
		self.write("<h2>Group List</h2>")
		self.write("<table>")
		groups = db.c.fetch_all(
				"SELECT COUNT(r4_song_group.song_id) AS num_songs, r4_groups.group_id AS id, group_name AS name, group_elec_block AS elec_block, group_cool_time AS cool_time "
				"FROM r4_groups "
					"JOIN r4_song_group USING (group_id) "
					"JOIN r4_songs ON (r4_song_group.song_id = r4_songs.song_id AND song_verified = TRUE) "
				"GROUP BY r4_groups.group_id, group_name, group_elec_block, group_cool_time "
				"ORDER BY group_name",
				(self.sid,))
		for row in groups:
			self.write("<tr><td>%s</td>" % row['id'])
			self.write("<td onclick=\"window.location.href = '../song_list/' + window.top.current_tool + '?id=%s';\" style='cursor: pointer;'>%s</td><td>" % (row['id'], row['name']))
			self.write("<td>%s songs</td>" % row['num_songs'])
			if row['elec_block'] == None:
				row['elec_block'] = ''
			if row['cool_time'] == None:
				row['cool_time'] = ''
			self.write("<td><input type='text' id='elec_block_%s' value='%s' /><button onclick=\"window.top.call_api('admin/edit_group_elec_block', { 'group_id': %s, 'elec_block': document.getElementById('elec_block_%s').value })\">BLK</button></td>" % (row['id'], row['elec_block'], row['id'], row['id'] ))
			self.write("<td><input type='text' id='cooldown_%s' value='%s' /><button onclick=\"window.top.call_api('admin/edit_group_cooldown', { 'group_id': %s, 'cooldown': document.getElementById('cooldown_%s').value })\">CD</button></td>" % (row['id'], row['cool_time'], row['id'], row['id'] ))
			self.write("<td><a onclick=\"window.top.call_api('admin/\"></td>")
			self.write("</tr>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/song_list/group_edit")
class GroupEditSongList(api.web.HTMLRequest):
	admin_required = True
	fields = { "id": (api.web.fieldtypes.group_id, True) }

	def get(self):
		group = SongGroup.load_from_id(self.get_argument("id"))
		self.write(self.render_string("bare_header.html", title="Song List"))
		self.write("<h2>%s Songs</h2>" % (group.data['name']))
		self.write("<table>")
		for row in db.c.fetch_all("SELECT r4_songs.song_id AS id, song_title AS title, album_name, group_is_tag FROM r4_song_group JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) WHERE group_id = %s AND song_verified = TRUE ORDER BY group_is_tag, album_name, title", (group.id,)):
			self.write("<tr><td>%s</th><td>%s</td><td>" % (row['id'], row['album_name']))
			self.write("</td><td>%s</td><td>" % row['title'])
			if not row['group_is_tag']:
				self.write("<a class='group_name group_delete' onclick=\"window.top.call_api('admin/remove_group_from_song', { 'song_id': %s, 'group_id': %s });\">%s (X)</a> " % (row['id'], group.id, group.data['name']))
			self.write("</td></tr>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/tools/disassociate_groups")
class DisassociateGroupTool(api.web.HTMLRequest):
	admin_required = True

	def get(self):
		self.write(self.render_string("bare_header.html", title="Disassociate Groups"))
		self.write("<h2>Disassociate Groups</h2>")
		self.write(self.render_string("basic_footer.html"))

@handle_url("/admin/album_list/disassociate_groups")
class DisassociateGroupAlbumList(AlbumList):
	pass

@handle_url("/admin/song_list/disassociate_groups")
class DisassociateGroupSongList(SongList):
	def render_row_special(self, row):
		self.write("<td>")
		for group in db.c.fetch_all("SELECT r4_groups.group_id, group_name, group_is_tag FROM r4_song_group JOIN r4_groups USING (group_id) WHERE song_id = %s ORDER BY group_is_tag DESC, group_name", (row['id'],)):
			if not group['group_is_tag']:
				self.write("<a class='group_name group_delete' onclick=\"window.top.call_api('admin/remove_group_from_song', { 'song_id': %s, 'group_id': %s });\">%s (X)</a> " % (row['id'], group['group_id'], group['group_name']))
			else:
				self.write("<span class='group_name'>%s</span>" % (group['group_name'],))
		self.write("</td>")
