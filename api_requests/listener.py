import tornado.web

from api.web import APIHandler
from api import fieldtypes
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url

from libs import cache
from libs import log
from libs import config
from rainwave import user as UserLib

@handle_api_url("listener")
class ListenerDetailRequest(APIHandler):
	sid_required = False
	login_required = False
	fields = { "user_id": (fieldtypes.user_id, True) }
	
	def post(self):
		user = db.fetch_row(
			"SELECT user_id, username AS name, user_avatar AS avatar, user_avatar_type AS avatar_type, user_colour AS colour, rank_title AS rank, "
				"radio_totalvotes AS total_votes, radio_totalratings AS total_ratings, radio_totalmindchange AS mind_changes, "
				"radio_totalrequests AS total_requests, radio_winningvotes AS winning_votes, radio_losingvotes AS losing_votes, "
				"radio_winningrequests AS winning_requests, radio_losingrequests AS losing_requests"
			"FROM phpbb_users JOIN phpbb_ranks ON (user_rank = rank_id) WHERE user_id = %s",
			(user_id,))

		user['avatar'] = UserLib.solve_avatar(user['avatar_type'], user['avatar'])
		user.pop("avatar_type")

		user['top_albums'] = db.fetch_all("SELECT album_name, album_rating FROM rw_album_ratings JOIN rw_albums USING (album_id) WHERE user_id = %s ORDER BY album_rating DESC LIMIT 10", (user_id,))

		user['votes_by_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, COUNT(vote_id) "
												"FROM r4_vote_history JOIN r4_songs USING (song_id) "
												"WHERE user_id = %s "
												"GROUP BY song_origin_sid",
												(self.get_argument("user_id"),))

		user['requests_by_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, COUNT(request_id) "
													"FROM r4_request_history JOIN r4_songs USING (song_id) "
													"WHERE user_id = %s "
													"GROUP BY song_origin_sid",
													(self.get_argument("user_id"),))

		user['ratings_by_station'] = db.c.fetch_all("SELECT song_origin_sid AS sid, AVG(song_rating_user) AS average_rating "
													"FROM r4_song_ratings JOIN r4_songs USING (song_id) "
													"WHERE user_id = %s "
													"GROUP BY song_origin_sid",
													(self.get_argument("user_id"),))

		self.append("listener", user)

@handle_api_url("current_listeners")
class CurrentListenersRequest(APIHandler):
	sid_required = True

	def post(self):
		self.append("current_listeners", cache.get_station(self.sid, "listeners_current"))