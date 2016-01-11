from api.web import APIHandler
from api import fieldtypes
from api.server import handle_api_url
from libs import db
from rainwave.playlist_objects.metadata import make_searchable_string
from api.exceptions import APIException

@handle_api_url("search")
class AlbumHandler(APIHandler):
	description = "Search artists, albums, and songs for a matching string.  Case insensitive.  Submitted string will be stripped of accents and punctuation."
	return_name = "search_results"
	sid_required = True
	fields = { "search": (fieldtypes.string, True) }

	def post(self):
		s = make_searchable_string(self.get_argument("search"))
		if len(s) < 3:
			raise APIException("search_string_too_short")

		s = "%%%s%%" % s

		artists = db.c.fetch_all("SELECT DISTINCT artist_id AS id, artist_name AS name FROM r4_song_sid JOIN r4_song_artist USING (song_id) JOIN r4_artists USING (artist_id) WHERE sid = %s AND artist_name_searchable LIKE %s ORDER BY artist_name LIMIT 50", (self.sid, s))

		if self.user.is_anonymous():
			albums = db.c.fetch_all(
				"SELECT DISTINCT album_id AS id, album_name AS name, album_cool AS cool, CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, "
					"FALSE AS fave, 0 AS rating_user, FALSE as rating_complete "
				"FROM r4_album_sid "
					"JOIN r4_albums USING (album_id) "
				"WHERE sid = %s AND album_exists = TRUE AND album_name_searchable LIKE %s "
				"ORDER BY album_name "
				"LIMIT 50",
				(self.sid, s)
			)
		else:
			albums = db.c.fetch_all(
				"SELECT DISTINCT r4_albums.album_id AS id, album_name AS name, album_cool AS cool, CAST(ROUND(CAST(album_rating AS NUMERIC), 1) AS REAL) AS rating, "
					"COALESCE(album_fave, FALSE) AS fave, COALESCE(album_rating_user, 0) AS rating_user, COALESCE(album_rating_complete, FALSE) AS rating_complete "
				"FROM r4_album_sid "
					"JOIN r4_albums USING (album_id) "
					"LEFT JOIN r4_album_ratings ON (r4_albums.album_id = r4_album_ratings.album_id AND user_id = %s AND r4_album_ratings.sid = %s) "
				"WHERE r4_album_sid.sid = %s AND album_exists = TRUE AND album_name_searchable LIKE %s "
				"ORDER BY album_name "
				"LIMIT 50",
				(self.user.id, self.sid, self.sid, s)
			)

		# use bigger query below
		# songs = db.c.fetch_all("SELECT DISTINCT song_id, song_title, album_name, song_origin_sid, song_cool, song_cool_end, song_url, song_length,  FROM r4_song_sid JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) WHERE sid = %s AND song_title_searchable LIKE %s", (self.sid, s))

		# base SQL here copy pasted from /rainwave/playlist_objects/album.py
		if self.user.is_anonymous():
			songs = db.c.fetch_all(
				"SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, song_added_on AS added_on, "
					"song_track_number AS track_number, song_disc_number as disc_number, "
					"song_url AS url, song_link_text AS link_text, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, "
					"FALSE AS requestable, song_cool AS cool, song_cool_end AS cool_end, "
					"song_artist_parseable AS artist_parseable, "
					"0 AS rating_user, FALSE AS fave, "
					"r4_albums.album_name, r4_songs.album_id "
				"FROM r4_song_sid "
					"JOIN r4_songs ON (r4_song_sid.song_id = r4_songs.song_id AND r4_songs.song_title_searchable LIKE %s) "
					"JOIN r4_albums ON (r4_songs.album_id = r4_albums.album_id) "
				"WHERE r4_song_sid.song_exists = TRUE AND r4_songs.song_verified = TRUE AND r4_song_sid.sid = %s "
				"ORDER BY album_name, song_title "
				"LIMIT 100",
				(s, self.sid))
		else:
			songs = db.c.fetch_all(
				"SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, song_added_on AS added_on, "
					"song_track_number AS track_number, song_disc_number as disc_number, "
					"song_url AS url, song_link_text AS link_text, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, "
					"TRUE AS requestable, song_cool AS cool, song_cool_end AS cool_end, "
					"song_artist_parseable AS artist_parseable, "
					"COALESCE(song_rating_user, 0) AS rating_user, COALESCE(song_fave, FALSE) AS fave, "
					"r4_albums.album_name, r4_songs.album_id "
				"FROM r4_song_sid "
					"JOIN r4_songs ON (r4_song_sid.song_id = r4_songs.song_id AND r4_songs.song_title_searchable LIKE %s) "
					"LEFT JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
					"JOIN r4_albums ON (r4_songs.album_id = r4_albums.album_id) "
				"WHERE r4_song_sid.song_exists = TRUE AND r4_songs.song_verified = TRUE AND r4_song_sid.sid = %s "
				"ORDER BY album_name, song_title "
				"LIMIT 100",
				(s, self.user.id, self.sid))

		self.append("artists", artists)
		self.append("albums", albums)
		self.append("songs", songs)
