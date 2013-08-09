import time

from api import fieldtypes
from api.web import RequestHandler
from api.server import handle_api_url

from rainwave import rating
from libs import db

@handle_api_url('fave_song')
class SubmitSongFave(RequestHandler):
	_fave_type = "song"
	login_required = True
	tunein_required = False
	description = "Fave un-fave a song."
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
			result = rating.set_album_fave(object_id, self.user.id, fave)
		if result:
			text = None
			if fave:
				text = "Favourited " + self._fave_type + "."
			else:
				text = "Unfavourited " + self._fave_type + "."
			self.append(self.return_name, { "code": 0, "text": text, "id": object_id, "fave": fave })
		else:
			self.append(self.return_name, { "code": -1, "text": "Fave failed." })
			

@handle_api_url('fave_album')
class SubmitAlbumFave(SubmitSongFave):
	_fave_type = "album"
	description = "Fave un-fave an album."
	fields = {
		"album_id": (fieldtypes.album_id, True),
		"fave": (fieldtypes.boolean, True)
	}
