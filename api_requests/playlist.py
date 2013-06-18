import tornado.web

from api.web import RequestHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url

from libs import cache
from libs import log
from libs import db
from rainwave import playlist

def get_all_albums(sid, user = None):
	if not user or user.is_anonymous():
		return cache.get_station(sid, "all_albums")
	else:
		return playlist.get_all_albums_list(sid, user)

@handle_api_url("all_albums")
class AllAlbumsRequestHandler(RequestHandler):
	return_name = "all_albums"

	def post(self):
		self.append(self.return_name, get_all_albums(self.sid, self.user))

@handle_api_url("artist")
class ArtistRequestHandler(RequestHandler):
	return_name = "artist"
	fields = { "id": (fieldtypes.positive_integer, True) }

	def post(self):
		try:
			artist = playlist.Artist.load_from_id(self.get_argument("id"))
			artist.load_all_songs(self.sid, self.user.id)
			self.append("artist", artist.to_dict(self.user))
		except playlist.MetadataNotFoundError:
			self.append("error", { "code": "404", "description": "Artist not found." })

@handle_api_url("album")
class AlbumRequestHandler(RequestHandler):
	return_name = "album"
	fields = { "id": (fieldtypes.positive_integer, True) }

	def post(self):
		try:
			album = playlist.Album.load_from_id_with_songs(self.get_argument("id"), self.sid, self.user)
			album.load_extra_detail(self.sid)
			self.append("album", album.to_dict(self.user))
		except playlist.MetadataNotFoundError:
			self.append("error", { "code": "404", "description": "Album not found." })

@handle_api_url("song")
class SongRequestHandler(RequestHandler):
	return_name = "song"
	fields = { "id": (fieldtypes.positive_integer, True) }

	def post(self):
		try:
			song = playlist.Song.load_from_id(self.get_argument("id"), self.sid)
			song.load_extra_detail()
			self.append("song", song.to_dict(self.user))
		except playlist.SongNonExistent:
			self.append("error", { "code": "404", "description": "Song not found." })

