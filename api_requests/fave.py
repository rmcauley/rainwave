from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url

from rainwave import rating

@handle_api_url('fave_song')
class SubmitSongFave(APIHandler):
	_fave_type = "song"
	login_required = True
	tunein_required = False
	sid_required = False
	description = "Fave or un-fave a song."
	fields = {
		"song_id": (fieldtypes.song_id, True),
		"fave": (fieldtypes.boolean, True)
	}

	def post(self):
		object_id = self.get_argument(self._fave_type + "_id")
		fave = self.get_argument("fave")
		result = False

		if self._fave_type == "song":
			result = rating.set_song_fave(object_id, self.user.id, fave)
		elif self._fave_type == "album":
			result = rating.set_album_fave(self.sid, object_id, self.user.id, fave)
		if result:
			text = None
			if fave:
				text = "Favourited " + self._fave_type + "."
			else:
				text = "Unfavourited " + self._fave_type + "."
			self.append_standard("fave_success", text, id = object_id, fave = fave, sid = self.sid)
		else:
			raise APIException("fave_failed", "Fave failed.")

@handle_api_url('fave_album')
class SubmitAlbumFave(SubmitSongFave):
	sid_required = True
	_fave_type = "album"
	description = "Fave or un-fave an album, specific to the station the request is being made on."
	fields = {
		"album_id": (fieldtypes.album_id, True),
		"fave": (fieldtypes.boolean, True)
	}
