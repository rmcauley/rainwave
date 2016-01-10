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

		artists = db.c.fetch_all("SELECT DISTINCT artist_id, artist_name FROM r4_song_sid JOIN r4_song_artist USING (song_id) JOIN r4_artists USING (artist_id) WHERE sid = %s AND artist_name_searchable LIKE %s", (self.sid, s))
		albums = db.c.fetch_all("SELECT DISTINCT album_id, album_name FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE sid = %s AND album_name_searchable LIKE %s", (self.sid, s))
		songs = db.c.fetch_all("SELECT DISTINCT song_id, song_title, album_name FROM r4_song_sid JOIN r4_songs USING (song_id) JOIN r4_albums USING (album_id) WHERE sid = %s AND song_title_searchable LIKE %s", (self.sid, s))

		self.append("artists", artists)
		self.append("albums", albums)
		self.append("songs", songs)
