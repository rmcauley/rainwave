import tornado.web

from api.web import APIHandler
from api.web import PrettyPrintAPIMixin
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
from api.server import handle_api_html_url

from libs import config
from libs import cache
from libs import log
from libs import db
from rainwave import playlist
from api_requests import tune_in

def get_all_albums(sid, user = None):
	if not user or user.is_anonymous():
		return cache.get_station(sid, "all_albums")
	else:
		return playlist.get_all_albums_list(sid, user)

@handle_api_url("all_albums")
class AllAlbumsHandler(APIHandler):
	description = "Get a list of all albums on the station playlist."
	return_name = "all_albums"

	def post(self):
		self.append(self.return_name, get_all_albums(self.sid, self.user))

@handle_api_url("artist")
class ArtistHandler(APIHandler):
	description = "Get detailed information about an artist."
	return_name = "artist"
	fields = { "id": (fieldtypes.artist_id, True) }

	def post(self):
		artist = playlist.Artist.load_from_id(self.get_argument("id"))
		artist.load_all_songs(self.sid, self.user.id)
		self.append("artist", artist.to_dict(self.user))

@handle_api_url("album")
class AlbumHandler(APIHandler):
	description = "Get detailed information about an album, including a list of songs in the album."
	return_name = "album"
	fields = { "id": (fieldtypes.album_id, True) }

	def post(self):
		album = playlist.Album.load_from_id_with_songs(self.get_argument("id"), self.sid, self.user)
		album.load_extra_detail(self.sid)
		self.append("album", album.to_dict(self.user))

@handle_api_url("song")
class SongHandler(APIHandler):
	description = "Get detailed information about a song."
	return_name = "song"
	fields = { "id": (fieldtypes.song_id, True) }

	def post(self):
		song = playlist.Song.load_from_id(self.get_argument("id"), self.sid)
		song.load_extra_detail()
		self.append("song", song.to_dict(self.user))

@handle_api_url("all_songs")
class AllSongsHandler(APIHandler):
	return_name = "all_songs"
	login_required = True
	sid_required = False
	allow_get = True
	description = "Gets every song including a user's ratings.  Order field can be 'name', sorting by album and song title, or 'rating'."
	fields = { "order": (fieldtypes.string, False) }
	
	def post(self):
		order = "album_name, song_title"
		distinct_on = "album_name, song_title"
		if self.get_argument("order") == "rating":
			order = "song_rating_user DESC, album_name, song_title"
			distinct_on = "song_rating_user, album_name, song_title"
		self.append(self.return_name, db.c.fetch_all(
			"SELECT DISTINCT ON (" + distinct_on + ") r4_songs.song_id AS id, song_title AS title, album_name, song_rating AS rating, song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_songs JOIN r4_song_sid USING (song_id) JOIN r4_albums USING (album_id) "
			"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
			"WHERE song_verified = TRUE ORDER BY " + order + "", 
			(self.user.id,)))
		
@handle_api_url("unrated_songs")
class UnratedSongsHandler(APIHandler):
	description = "Get unrated songs."
	return_name = "unrated_songs"
	login_required = True
	
	def post(self):
		self.append(self.return_name, playlist.get_unrated_songs_for_user(self.user.id))
		
@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(PrettyPrintAPIMixin, UnratedSongsHandler):
	pass

@handle_api_url("top_100")
class Top100Songs(APIHandler):
	description = "Get the 100 highest-rated songs on the station."
	return_name = 'top_100'
	login_required = False
	sid_required = False
	allow_get = True
	
	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT DISTINCT ON (song_rating, song_id) "
				"song_origin_sid AS origin_sid, song_id AS id, song_title AS title, album_name, song_rating, song_rating_count "
			"FROM r4_songs "
				"JOIN r4_song_sid USING (song_id) "
				"JOIN r4_albums USING (album_id) "
			"WHERE song_rating_count > 20 AND song_verified = TRUE "
			"ORDER BY song_rating DESC, song_id LIMIT 100"))

@handle_api_html_url("top_100")
class Top100SongsHTML(PrettyPrintAPIMixin, Top100Songs):
	pass

@handle_api_url("all_faves")
class AllFavHandler(APIHandler):
	description = "Get all songs that have been faved."
	return_name = "all_faves"
	login_required = True
	sid_required = False
	allow_get = True
	
	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT DISTINCT ON (album_name, song_title) song_id AS id, song_title AS title, album_name, song_rating AS rating, COALESCE(song_rating_user, 0) AS rating_user, TRUE AS fave "
			"FROM r4_song_ratings JOIN r4_songs USING (song_id) JOIN r4_song_sid USING (song_id) JOIN r4_albums USING (album_id) "
			"WHERE user_id = %s AND song_verified = TRUE ORDER BY album_name, song_title", (self.user.id,)))
		
@handle_api_html_url("all_faves")
class AllFavHTML(PrettyPrintAPIMixin, AllFavHandler):
	pass

@handle_api_url("playback_history")
class PlaybackHistory(APIHandler):
	description = "Get the last 100 songs that played on the station."
	return_name = "playback_history"
	login_required = False
	sid_required = True
	allow_get = True

	def post(self):
		if self.user.is_anonymous():
			self.append(self.return_name, db.c.fetch_all(
				"SELECT r4_song_history.song_id AS id, song_title AS title, album_id, album_name "
				"FROM r4_song_history JOIN r4_songs USING (song_id) JOIN r4_song_sid USING (song_id, sid) JOIN r4_albums USING (album_id) "
				"WHERE r4_song_history.sid = %s "
				"ORDER BY songhist_id DESC LIMIT 100",
				(self.sid,)))
		else:
			self.append(self.return_name, db.c.fetch_all(
				"SELECT r4_song_history.song_id AS id, song_title AS title, album_id, album_name, song_rating_user AS rating_user, song_fave AS fave "
				"FROM r4_song_history JOIN r4_songs USING (song_id) JOIN r4_song_sid USING (song_id, sid) JOIN r4_albums USING (album_id) LEFT JOIN r4_song_ratings ON r4_song_history.song_id = r4_song_ratings.song_id AND user_id = %s "
				"WHERE r4_song_history.sid = %s "
				"ORDER BY songhist_id DESC LIMIT 100",
				(self.user.id, self.sid)))

@handle_api_html_url("playback_history")
class PlaybackHistoryHTML(PrettyPrintAPIMixin, PlaybackHistory):
	pass

@handle_api_url("station_song_count")
class StationSongCountRequest(APIHandler):
	description = "Get the total number of songs in the playlist on each station."
	return_name = "station_song_count"
	login_required = False
	sid_required = False
	allow_get = True

	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT song_origin_sid AS sid, COUNT(song_id) AS song_count "
			"FROM r4_songs WHERE song_verified = TRUE GROUP BY song_origin_sid"))

@handle_api_url("stations")
class StationsRequest(APIHandler):
	description = "Get information about all available stations."
	auth_required = False
	return_name = "stations"
	sid_required = False

	def post(self):
		station_list = []
		for station_id in config.station_ids:
			station_list.append({
				"id": station_id,
				"name": config.station_id_friendly[station_id],
				"description": self.locale.translate("station_description_id_%s" % station_id),
				"stream": tune_in.get_round_robin_url(station_id, "mp3", self.user),
				"oggstream": tune_in.get_round_robin_url(station_id, "ogg", self.user)
			})
		self.append(self.return_name, station_list)
