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

@handle_api_url("all_songs")
class AllSongsRequestHandler(RequestHandler):
	return_name = "all_songs"
	login_required = True
	sid_required = False
	allow_get = True
	description = "Gets every song including a user's ratings.  Order field can be 'name', sorting by album and song title, or 'rating'."
	fields = { "order": (fieldtypes.string, False) }
	
	def post(self):
		order = "album_name, song_title"
		if self.get_argument("order") == "rating":
			order = "song_rating_user DESC"
		self.append(self.return_name, db.c.fetch_all(
			"SELECT song_id AS id, song_title AS title, album_name, song_rating AS rating, song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_songs JOIN r4_song_album USING (song_id) JOIN r4_albums USING (album_id) "
			"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
			"WHERE song_verified = TRUE ORDER BY " + order, (self.user.id,)))
		
@handle_api_url("unrated_songs")
class UnratedSongsRequestHandler(RequestHandler):
	return_name = "unrated_songs"
	login_required = True
	
	def post(self):
		self.append(self.return_name, playlist.get_unrated_songs_for_user(self.user.id))
		
@handle_api_url("top_100")
class Top100Songs(RequestHandler):
	return_name = 'top_100'
	login_required = False
	sid_required = False
	allow_get = True
	
	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT song_id AS id, song_title AS title, album_name "
			"FROM r4_songs JOIN r4_song_album USING (song_id) JOIN r4_albums USING (album_id) "
			"ORDER BY song_rating DESC LIMIT 100"))

@handle_api_url("all_faves")
class AllFavRequestHandler(RequestHandler):
	return_name = "all_faves"
	login_required = True
	sid_required = False
	allow_get = True
	
	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT r4_songs.song_id AS id, song_title AS title, album_name, song_rating AS rating, song_rating_user AS rating_user, TRUE as fave "
			"FROM r4_song_ratings JOIN r4_songs ON (song_fave = TRUE AND user_id = %s AND r4_song_ratings.song_id = r4_songs.song_id) "
			"JOIN r4_song_album ON (r4_songs.song_id = r4_song_album.song_id) JOIN r4_albums USING (album_id) "
			"WHERE song_verified = TRUE ORDER BY album_name, song_title", (self.user.id,)))

@handle_api_url("playback_history")
class PlaybackHistory(RequestHandler):
	return_name = "playback_history"
	login_required = False
	sid_required = True
	allow_get = True
	
	def post(self):
		if self.user.is_anonymous():
			self.append(self.return_name, db.c.fetch_all(
				"SELECT song_id AS id, song_title AS title, album_name "
				"FROM r4_song_history JOIN r4_songs USING (song_id) JOIN r4_song_album USING (song_id) JOIN r4_albums USING (album_id) "
				"ORDER BY songhist_id DESC LIMIT 100"))
		else:
			self.append(self.return_name, db.c.fetch_all(
				"SELECT song_id AS id, song_title AS title, album_name, song_rating_user AS rating_user, song_fave AS fave "
				"FROM r4_song_history JOIN r4_songs USING (song_id) JOIN r4_song_album USING (song_id) JOIN r4_albums USING (album_id) "
				"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
				"ORDER BY songhist_id DESC LIMIT 100"))

@handle_api_url("station_song_count")
class StationSongCountRequest(RequestHandler):
	return_name = "station_song_count"
	login_required = False
	sid_required = False
	allow_get = True

	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT song_origin_sid AS sid, COUNT(song_id) AS song_count "
			"FROM r4_songs WHERE song_verified = TRUE GROUP BY song_origin_sid"))
