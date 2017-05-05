from api.web import APIHandler
from api.web import PrettyPrintAPIMixin
from api import fieldtypes
from api.server import handle_api_url
from api.server import handle_api_html_url

try:
	import ujson as json
except ImportError:
	import json

from libs import cache
from libs import db
from libs import config
from libs.pretty_date import pretty_date
from rainwave import playlist
from rainwave.playlist_objects.metadata import MetadataNotFoundError
from api.exceptions import APIException

def get_all_albums(sid, user = None, with_searchable = True):
	if with_searchable:
		if not user or user.is_anonymous():
			return cache.get_station(sid, "all_albums")
		else:
			return playlist.get_all_albums_list(sid, user)
	else:
		if not user or user.is_anonymous():
			return cache.get_station(sid, "all_albums_no_searchable")
		else:
			return playlist.get_all_albums_list(sid, user, with_searchable = False)

def get_all_artists(sid, with_searchable = True):
	if with_searchable:
		return cache.get_station(sid, "all_artists")
	else:
		return cache.get_station(sid, "all_artists_no_searchable")

def get_all_groups(sid, with_searchable = True):
	if with_searchable:
		return cache.get_station(sid, "all_groups")
	else:
		return cache.get_station(sid, "all_groups_no_searchable")

def get_all_groups_power(sid, with_searchable = True):
	if with_searchable:
		return cache.get_station(sid, "all_groups_power")
	else:
		return cache.get_station(sid, "all_groups_power_no_searchable")

@handle_api_url("all_albums")
class AllAlbumsHandler(APIHandler):
	description = "Get a list of all albums on the station playlist."
	return_name = "all_albums"
	fields = { "no_searchable": (fieldtypes.boolean, None) }

	def post(self):
		self.append(self.return_name, get_all_albums(self.sid, self.user, with_searchable=not self.get_argument("no_searchable")))

@handle_api_url("all_artists")
class AllArtistsHandler(APIHandler):
	description = "Get a list of all artists on the station playlist."
	return_name = "all_artists"
	fields = { "no_searchable": (fieldtypes.boolean, None) }

	def post(self):
		self.append(self.return_name, get_all_artists(self.sid, with_searchable=not self.get_argument("no_searchable")))

@handle_api_url("all_groups")
class AllGroupsHandler(APIHandler):
	description = "Get a list of all song groups on the station playlist.  Supply the 'all' flag to get a list of categories that includes categories that only contain a single album."
	return_name = "all_groups"
	fields = { "all": (fieldtypes.boolean, None), "no_searchable": (fieldtypes.boolean, None) }

	def post(self):
		if self.get_argument("all"):
			self.append(self.return_name, get_all_groups_power(self.sid, with_searchable=not self.get_argument("no_searchable")))
		else:
			self.append(self.return_name, get_all_groups(self.sid, with_searchable=not self.get_argument("no_searchable")))

@handle_api_url("artist")
class ArtistHandler(APIHandler):
	description = "Get detailed information about an artist."
	return_name = "artist"
	fields = { "id": (fieldtypes.artist_id, True) }

	def post(self):
		artist = playlist.Artist.load_from_id(self.get_argument("id"))
		artist.load_all_songs(self.sid, self.user.id)
		self.append(self.return_name, artist.to_dict_full(self.user))

@handle_api_url("group")
class GroupHandler(APIHandler):
	description = "Get detailed information about a song group."
	return_name = "group"
	fields = { "id": (fieldtypes.group_id, True) }

	def post(self):
		group = playlist.SongGroup.load_from_id(self.get_argument("id"))
		group.load_songs_from_sid(self.sid, self.user.id)
		self.append(self.return_name, group.to_dict_full(self.user))

@handle_api_url("album")
class AlbumHandler(APIHandler):
	description = "Get detailed information about an album, including a list of songs in the album.  'Sort' can be set to 'added_on' to sort by when the song was added to the radio."
	return_name = "album"
	fields = { "id": (fieldtypes.album_id, True), "sort": (fieldtypes.string, None), "all_categories": (fieldtypes.boolean, None) }

	def post(self):
		try:
			album = playlist.Album.load_from_id_with_songs(self.get_argument("id"), self.sid, self.user, sort=self.get_argument("sort"))
			album.load_extra_detail(self.sid, self.get_argument("all_categories"))
		except MetadataNotFoundError:
			self.return_name = "album_error"
			valid_sids = db.c.fetch_list("SELECT sid FROM r4_album_sid WHERE album_id = %s AND sid != 0 ORDER BY sid", (self.get_argument("id"),))
			if not valid_sids or not len(valid_sids):
				raise APIException("album_is_dj_only")
			elif config.get("default_station") in valid_sids:
				raise APIException("album_on_other_station", available_station=config.station_id_friendly[config.get("default_station")], available_sid=valid_sids[0])
			else:
				raise APIException("album_on_other_station", available_station=config.station_id_friendly[valid_sids[0]], available_sid=valid_sids[0])
		self.append("album", album.to_dict_full(self.user))

@handle_api_url("song")
class SongHandler(APIHandler):
	description = "Get detailed information about a song."
	return_name = "song"
	fields = { "id": (fieldtypes.song_id, True), "all_categories": (fieldtypes.boolean, None) }

	def post(self):
		song = playlist.Song.load_from_id(self.get_argument("id"), self.sid, all_categories = self.get_argument("all_categories"))
		song.load_extra_detail(self.sid)
		self.append("song", song.to_dict(self.user))

@handle_api_url("all_songs")
class AllSongsHandler(APIHandler):
	return_name = "all_songs"
	login_required = True
	sid_required = False
	allow_get = True
	description = "Gets every song including a user's ratings.  Order field can be 'name', sorting by album and song title, or 'rating'."
	pagination = True
	fields = { "order": (fieldtypes.string, False) }

	def post(self):
		order = "album_name, song_title"
		distinct_on = "album_name, song_title"
		if self.get_argument("order") == "rating":
			order = "song_rating_user DESC, album_name, song_title"
			distinct_on = "song_rating_user, album_name, song_title"
		self.append(self.return_name, db.c.fetch_all(
			"SELECT DISTINCT ON (" + distinct_on + ") r4_songs.song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_songs JOIN r4_song_sid USING (song_id) JOIN r4_albums USING (album_id) "
			"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND user_id = %s) "
			"WHERE song_verified = TRUE ORDER BY " + order + " " + self.get_sql_limit_string(),
			(self.user.id,)))

@handle_api_url("unrated_songs")
class UnratedSongsHandler(APIHandler):
	description = "Get all of a user's unrated songs."
	return_name = "unrated_songs"
	login_required = True
	pagination = True

	def post(self):
		self.append(self.return_name, playlist.get_unrated_songs_for_user(self.user.id, self.get_sql_limit_string()))

@handle_api_html_url("unrated_songs")
class UnratedSongsHTML(PrettyPrintAPIMixin, UnratedSongsHandler):
	pass

@handle_api_url("top_100")
class Top100Songs(APIHandler):
	description = "Get the 100 highest-rated songs on the entirety of Rainwave, or by station if a station ID is specified in the arguments."
	return_name = 'top_100'
	login_required = False
	sid_required = False
	allow_get = True

	def post(self):
		if 'sid' in self.request.arguments:
			self.append(self.return_name,
				db.c.fetch_all(
					"SELECT DISTINCT ON (song_rating, song_id) "
						"song_origin_sid AS origin_sid, song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS song_rating, song_rating_count "
					"FROM r4_song_sid "
						"JOIN r4_songs USING (song_id) "
						"JOIN r4_albums USING (album_id) "
					"WHERE r4_song_sid.sid = %s AND song_rating_count > 20 AND song_verified = TRUE "
					"ORDER BY song_rating DESC, song_id LIMIT 100", (self.sid,))
				)
		else:
			self.append(self.return_name, db.c.fetch_all(
				"SELECT DISTINCT ON (song_rating, song_id) "
					"song_origin_sid AS origin_sid, song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS song_rating, song_rating_count "
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
	description = "Get all songs that have been faved by the user."
	return_name = "all_faves"
	login_required = True
	sid_required = False
	allow_get = True
	pagination = True

	def post(self):
		if 'sid' in self.request.arguments:
			self.append(self.return_name, db.c.fetch_all(
			"SELECT r4_song_ratings.song_id AS id, song_title AS title, r4_albums.album_id, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, COALESCE(song_rating_user, 0) AS rating_user, song_fave AS fave, r4_song_sid.song_cool_end AS cool_end "
			"FROM r4_song_ratings "
				"JOIN r4_song_sid ON (r4_song_ratings.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) "
				"JOIN r4_songs ON (r4_song_ratings.song_id = r4_songs.song_id) "
				"JOIN r4_albums USING (album_id) "
			"WHERE user_id = %s AND song_exists = TRUE AND song_fave = TRUE ORDER BY album_name, song_title " + self.get_sql_limit_string(), (self.sid, self.user.id)))
		else:
			self.append(self.return_name, db.c.fetch_all(
			"SELECT r4_song_ratings.song_id AS id, song_title AS title, r4_albums.album_id, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, COALESCE(song_rating_user, 0) AS rating_user, song_fave AS fave "
			"FROM r4_song_ratings JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) "
			"WHERE user_id = %s AND song_verified = TRUE AND song_fave = TRUE ORDER BY album_name, song_title " + self.get_sql_limit_string(), (self.user.id,)))

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
	pagination = True

	def post(self):
		if self.user.is_anonymous():
			self.append(self.return_name, db.c.fetch_all(
				"SELECT r4_song_history.song_id AS id, song_title AS title, album_id, album_name, songhist_time AS song_played_at, song_artist_parseable AS artist_parseable, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating "
				"FROM r4_song_history JOIN r4_song_sid USING (song_id, sid) JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) "
				"WHERE r4_song_history.sid = %s "
				"ORDER BY songhist_id DESC " + self.get_sql_limit_string(),
				(self.sid,)))
		else:
			self.append(self.return_name, db.c.fetch_all(
				"SELECT r4_song_history.song_id AS id, song_title AS title, album_id, album_name, song_rating_user AS rating_user, song_fave AS fave, songhist_time AS song_played_at, song_artist_parseable AS artist_parseable, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_rating_user AS rating_user "
				"FROM r4_song_history JOIN r4_song_sid USING (song_id, sid) JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) "
					"LEFT JOIN r4_song_ratings ON r4_song_history.song_id = r4_song_ratings.song_id AND user_id = %s "
				"WHERE r4_song_history.sid = %s "
				"ORDER BY songhist_id DESC " + self.get_sql_limit_string(),
				(self.user.id, self.sid)))

@handle_api_html_url("playback_history")
class PlaybackHistoryHTML(PrettyPrintAPIMixin, PlaybackHistory):
	login_required = False
	auth_required = False

	columns = [ "title", "album_name" ]

	def header_special(self):
		self.write("<th>Artist(s)</th>")
		self.write("<th>Site Rating</th>")
		if not self.user.is_anonymous():
			self.write("<th>Your Rating</th>")
		self.write("<th>Time Played</th>")

	def row_special(self, row):
		self.write("<td>")
		artists = json.loads(row['artist_parseable'])
		for artist in artists:
			self.write("%s" % artist['name'])
			if artist != artists[-1]:
				self.write(", ")
		self.write("</td>")

		self.write("<td>%s</td>" % row['rating'])
		if 'rating_user' in row:
			self.write("<td>%s</td>" % (row['rating_user'] or ''))

		self.write("<td>%s</td>" % pretty_date(row['song_played_at']))

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

@handle_api_url("user_requested_history")
class AllRequestedSongs(APIHandler):
	description = "Shows the user's completed requests."
	return_name = "user_requested_history"
	login_required = True
	sid_required = True
	pagination = True

	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT "
				"r4_songs.song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_request_history "
				"JOIN r4_song_sid USING (song_id, sid) "
				"JOIN r4_songs USING (song_id) "
				"JOIN r4_albums USING (album_id) "
				"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = r4_request_history.user_id) "
			"WHERE r4_request_history.sid = %s AND r4_request_history.user_id = %s AND song_verified = TRUE ORDER BY request_fulfilled_at DESC " + self.get_sql_limit_string(),
			(self.sid, self.user.id)))

@handle_api_html_url("user_requested_history")
class AllRequestedSongsHTML(PrettyPrintAPIMixin, AllRequestedSongs):
	pass

@handle_api_url("user_recent_votes")
class RecentlyVotedSongs(APIHandler):
	description = "Shows the user's recently voted on songs."
	return_name = "user_recent_votes"
	login_required = True
	sid_required = True
	pagination = True

	def post(self):
		self.append(self.return_name, db.c.fetch_all(
			"SELECT "
				"r4_songs.song_id AS id, song_title AS title, album_name, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_rating_user AS rating_user, song_fave AS fave "
			"FROM r4_vote_history "
				"JOIN r4_song_sid USING (song_id, sid) "
				"JOIN r4_songs USING (song_id) "
				"JOIN r4_albums USING (album_id) "
				"LEFT JOIN r4_song_ratings ON (r4_songs.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = r4_vote_history.user_id) "
			"WHERE r4_vote_history.sid = %s AND r4_vote_history.user_id = %s AND song_verified = TRUE ORDER BY vote_id DESC " + self.get_sql_limit_string(),
			(self.sid, self.user.id)))

@handle_api_html_url("user_recent_votes")
class RecentlyVotedSongsHTML(PrettyPrintAPIMixin, RecentlyVotedSongs):
	pass
