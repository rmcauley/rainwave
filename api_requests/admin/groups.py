import api.web
from api.server import handle_api_url
from api import fieldtypes
from rainwave.playlist import Song

@handle_api_url("admin/add_group_to_song")
class AddGroupToSong(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Add a group to a song."
	fields = { "song_id": (fieldtypes.song_id, True),
		"group_name": (fieldtypes.string, True)}

	def post(self):
		s = Song.load_from_id(self.get_argument("song_id"));
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
		s = Song.load_from_id(self.get_argument("song_id"));
		s.remove_group_id(self.get_argument("group_id"))
		self.append(self.return_name, { "success": "true", "tl_key": "Group removed from song ID." })