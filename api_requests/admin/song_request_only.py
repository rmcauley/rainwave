from libs import db
import api.web
from api.server import handle_api_url
from api import fieldtypes

@handle_api_url("admin/set_song_request_only")
class SetSongRequestOnly(api.web.APIHandler):
	admin_required = True
	sid_required = True
	description = "Sets a song to be played only by request."
	fields = { "song_id": (fieldtypes.song_id, True), "request_only": (fieldtypes.boolean, True) }

	def post(self):
		if self.get_argument("request_only"):
			db.c.update("UPDATE r4_song_sid SET song_request_only_end = NULL WHERE song_id = %s AND sid = %s", (self.get_argument("song_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Song ID %s is now request only." % self.get_argument("song_id") })
		else:
			db.c.update("UPDATE r4_song_sid SET song_request_only_end = 0 WHERE song_id = %s AND sid = %s", (self.get_argument("song_id"), self.sid))
			self.append(self.return_name, { "success": True, "text": "Song ID %s is not request only." % self.get_argument("song_id") })
