import math

from api.web import APIHandler
from api.web import PrettyPrintAPIMixin
from api import fieldtypes
from api.server import handle_api_url, handle_api_html_url

from libs import cache
from libs import db
from rainwave import playlist
from rainwave import user as UserLib

@handle_api_url("listener")
class ListenerDetailRequest(APIHandler):
	description = "Gets detailed information, such as favourite albums and rating histogram, on a particular user."
	sid_required = False
	login_required = False
	fields = { "id": (fieldtypes.user_id, True) }

	def post(self):
		user = db.c.fetch_row(
			"SELECT user_id, username AS name, user_avatar AS avatar, user_avatar_type AS avatar_type, user_colour AS colour, rank_title AS rank, "
				"radio_totalvotes AS total_votes, radio_totalratings AS total_ratings, radio_totalmindchange AS mind_changes, "
				"radio_totalrequests AS total_requests, radio_winningvotes AS winning_votes, radio_losingvotes AS losing_votes, "
				"radio_winningrequests AS winning_requests, radio_losingrequests AS losing_requests, user_regdate AS regdate "
			"FROM phpbb_users LEFT JOIN phpbb_ranks ON (user_rank = rank_id) WHERE user_id = %s",
			(self.get_argument("id"),))

		user['avatar'] = UserLib.solve_avatar(user['avatar_type'], user['avatar'])
		user.pop("avatar_type")

		user['top_albums'] = db.c.fetch_all(
			"SELECT album_id AS id, album_name AS name, album_rating_user AS rating_listener, album_rating AS rating "
			"FROM r4_album_ratings "
				"JOIN r4_album_sid USING (album_id, sid) "
				"JOIN r4_albums USING (album_id) "
			"WHERE user_id = %s AND r4_album_ratings.sid = %s AND album_exists = TRUE AND r4_album_sid.album_song_count >= 4 AND r4_album_ratings.album_rating_user > 0 "
			"ORDER BY album_rating_user DESC NULLS LAST, r4_album_sid.album_song_count DESC "
			"LIMIT 10",
			(self.get_argument("id"), self.sid)
		)

		if self.sid == 5:
			user['top_request_albums'] = db.c.fetch_all(
				"SELECT COUNT(request_id) AS request_count_listener, id, name FROM ("
					"SELECT r4_songs.album_id AS id, album_name AS name, request_id "
					"FROM r4_request_history "
						"JOIN r4_songs USING (song_id) "
						"JOIN r4_albums USING (album_id) "
					"WHERE r4_request_history.user_id = %s "
					"ORDER BY request_id DESC "
					"LIMIT 1000"
				") AS reqs "
				"GROUP BY id, name "
				"ORDER BY request_count_listener DESC "
				"LIMIT 10",
				(self.get_argument("id"),)
			)
		else:
			user['top_request_albums'] = db.c.fetch_all(
				"SELECT COUNT(request_id) AS request_count_listener, id, name FROM ("
					"SELECT r4_songs.album_id AS id, album_name AS name, request_id "
					"FROM r4_request_history "
						"JOIN r4_songs USING (song_id) "
						"JOIN r4_album_sid ON (r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE AND r4_songs.album_id = r4_album_sid.album_id) "
						"JOIN r4_albums ON (r4_album_sid.album_id = r4_albums.album_id) "
					"WHERE r4_request_history.user_id = %s AND r4_request_history.sid = %s "
					"ORDER BY request_id DESC "
					"LIMIT 1000"
				") AS reqs "
				"GROUP BY id, name "
				"ORDER BY request_count_listener DESC "
				"LIMIT 10",
				(self.sid, self.get_argument("id"), self.sid)
			)

		user['votes_by_station'] = db.c.fetch_all("SELECT sid, COUNT(vote_id) AS votes "
												"FROM r4_vote_history "
												"WHERE user_id = %s "
												"GROUP BY sid",
												(self.get_argument("id"),))

		# user['votes_by_source_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, COUNT(vote_id) AS votes "
		# 										"FROM r4_vote_history JOIN r4_songs USING (song_id) "
		# 										"WHERE user_id = %s "
		# 										"GROUP BY song_origin_sid",
		# 										(self.get_argument("id"),))

		user['requests_by_station'] = db.c.fetch_all("SELECT sid, COUNT(request_id) AS requests "
													"FROM r4_request_history "
													"WHERE user_id = %s AND sid IS NOT NULL "
													"GROUP BY sid",
													(self.get_argument("id"),))

		user['requests_by_source_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, COUNT(request_id) AS requests "
													"FROM r4_request_history JOIN r4_songs USING (song_id) "
													"WHERE user_id = %s AND song_verified = TRUE "
													"GROUP BY song_origin_sid",
													(self.get_argument("id"),))

		user['ratings_by_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, TO_CHAR(AVG(song_rating_user), 'FM9.99') AS average_rating, COUNT(song_rating_user) AS ratings "
													"FROM r4_song_ratings JOIN r4_songs USING (song_id) "
													"WHERE user_id = %s AND song_verified = TRUE AND song_origin_sid > 0 AND song_rating_user IS NOT NULL "
													"GROUP BY song_origin_sid",
													(self.get_argument("id"),))

		user['rating_completion'] = {}
		for row in user['ratings_by_station']:
			user['rating_completion'][row['sid']] = math.floor(float(row['ratings']) / float(playlist.num_origin_songs[row['sid']]) * 100)

		user['rating_spread'] = db.c.fetch_all("SELECT COUNT(song_id) AS ratings, song_rating_user AS rating FROM r4_song_ratings JOIN r4_songs USING (song_id) WHERE user_id = %s AND song_rating_user IS NOT NULL AND song_verified IS TRUE GROUP BY song_rating_user ORDER BY song_rating_user", (self.get_argument("id"), ))

		self.append("listener", user)

@handle_api_url("current_listeners")
class CurrentListenersRequest(APIHandler):
	description = "Lists all current listeners for a station."
	sid_required = True

	def post(self):
		self.append("current_listeners", cache.get_station(self.sid, "current_listeners"))

@handle_api_html_url("current_listeners")
class CurrentListenersHTML(PrettyPrintAPIMixin, CurrentListenersRequest):
	pass

@handle_api_url("user_info")
class UserInfoRequest(APIHandler):
	description = "Get information about the user whose ID and API key has been provided."
	auth_required = True
	sid_required = False

	def post(self):
		self.append("user_info", self.user.to_private_dict())
