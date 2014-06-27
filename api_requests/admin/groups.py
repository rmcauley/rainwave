import api.web
from api.server import handle_api_url
from api import fieldtypes
from rainwave.playlist import Song
from rainwave.playlist import SongGroup

# @handle_api_url("admin/add_group_to_song")
class AddGroupToSong(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Add a group to a song."
	fields = { "song_id": (fieldtypes.song_id, True),
		"group_name": (fieldtypes.string, True)}

	def post(self):
		s = Song.load_from_id(self.get_argument("song_id"))
		#If comma-separated values, will do each individually
		for group in self.get_argument("group").split(","):
			s.add_group(group.strip())
		self.append(self.return_name, { "success": "true", "text": "Group added to song." })
			
@handle_api_url("admin/remove_group_from_song")
class RemoveGroupFromSong(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Removes the group from a song."
	fields = { "song_id": (fieldtypes.song_id, True),
		"group_id": (fieldtypes.group_id, True) }

	def post(self):
		s = Song.load_from_id(self.get_argument("song_id"))
		s.remove_group_id(self.get_argument("group_id"))
		self.append(self.return_name, { "success": "true", "tl_key": "Group removed from song ID." })

@handle_api_url("admin/edit_group_elec_block")
class EditGroup(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "group_id": (fieldtypes.group_id, True), "elec_block": (fieldtypes.positive_integer, None) }

	def post(self):
		g = SongGroup.load_from_id(self.get_argument("group_id"))
		g.set_elec_block(self.get_argument("elec_block"))
		self.append(self.return_name, { "tl_key": "group_edit_success", "text": "Group elec block updated to %s" % self.get_argument("elec_block") })

@handle_api_url("admin/edit_group_cooldown")
class EditGroupCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "group_id": (fieldtypes.group_id, True), "cooldown": (fieldtypes.positive_integer, True) }

	def post(self):
		g = SongGroup.load_from_id(self.get_argument("group_id"))
		g.set_cooldown(self.get_argument("cooldown"))
		self.append(self.return_name, { "tl_key": "group_edit_success", "text": "Group cooldown updated to %s" % self.get_argument("cooldown") })

# @handle_api_url("admin/list_groups")
class ListGroups(api.web.APIHandler):
	admin_required = True
	sid_required = True
	return_name = "groups"

	def post(self):
		self.append(self.return_name,
			db.c.fetch_all(
				"SELECT COUNT(r4_song_group.song_id) AS group_num_songs, r4_groups.group_id, group_name, group_elec_block, group_cool_time "
				"FROM r4_song_sid "
					"JOIN r4_song_group USING (song_id) "
					"JOIN r4_groups USING (group_id) "
				"WHERE sid = %s AND song_exists = TRUE "
				"GROUP BY r4_groups.group_id, group_name, group_elec_block, group_cool_time "
				"ORDER BY group_name",
				(self.sid,)))

# @handle_api_url("admin/group_songs")
class GroupSongs(api.web.APIHandler):
	admin_required = True
	sid_required = True
	return_name = "group_songs"
	fields = { "group_id": (fieldtypes.group_id, True) }

	def post(self):
		self.append(self.return_name,
			db.c.fetch_all(
				"SELECT r4_songs.song_id, song_title, album_name, group_id, group_is_tag "
				"FROM r4_song_groups "
					"JOIN r4_song_sid USING (song_id) "
					"JOIN r4_songs ON (r4_song_sid.song_id = r4_songs.sid) "
					"JOIN r4_albums USING (album_id) "
				"WHERE group_id = %s AND sid = %s AND song_exists = TRUE "
				"ORDER BY album_name, song_title",
				(self.get_argument("group_id", self.sid))))