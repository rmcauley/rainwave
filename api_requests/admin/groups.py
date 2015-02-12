import api.web
from api.server import handle_api_url
from api import fieldtypes
from rainwave.playlist import Song
from rainwave.playlist import SongGroup

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
	fields = { "group_id": (fieldtypes.group_id, True), "elec_block": (fieldtypes.zero_or_greater_integer, None) }

	def post(self):
		g = SongGroup.load_from_id(self.get_argument("group_id"))
		g.set_elec_block(self.get_argument("elec_block"))
		self.append(self.return_name, { "tl_key": "group_edit_success", "text": "Group elec block updated to %s" % self.get_argument("elec_block") })

@handle_api_url("admin/edit_group_cooldown")
class EditGroupCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "group_id": (fieldtypes.group_id, True), "cooldown": (fieldtypes.zero_or_greater_integer, True) }

	def post(self):
		g = SongGroup.load_from_id(self.get_argument("group_id"))
		g.set_cooldown(self.get_argument("cooldown"))
		self.append(self.return_name, { "tl_key": "group_edit_success", "text": "Group cooldown updated to %s" % self.get_argument("cooldown") })