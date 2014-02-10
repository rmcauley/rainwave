from libs import db
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes
from Rainwave.playlist import Song

@handle_api_url("admin/add_group_cooldown")
class AddGroupCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Add a group cooldown for a song"
	fields = { "song_id": (fieldtypes.song_id, True),
		"group": (fieldtypes.string, True)}

	def post(self):
		s = Song.load_from_id(self.get_argument("song_id"));
		#If comma-separated values, will do each individually
		for group in self.get_argument("group").split(","):
			s.add_group(group.strip())
			
@handle_api_url("admin/remove_group_cooldown")
class RemoveGroupCooldown(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Removes the group cooldown from a song."
	fields = { "song_id": (fieldtypes.song_id, True),
		"group_id": (fieldtypes.group_id, True) }

	def post(self):
		s = Song.load_from_id(self.get_argument("song_id"));
		s.remove_group_id(self.get_argument("group_id"))
