from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url

from libs import cache
from rainwave import rating as ratinglib

@handle_api_url('rate')
class SubmitRatingRequest(APIHandler):
	sid_required = True
	return_name = "rate_result"
	login_required = True
	tunein_required = False
	unlocked_listener_only = False
	description = "Rate a song.  The user must have been tuned in for this song to rate it, or they must be tuned in if it's the currently playing song."
	fields = {
		"song_id": (fieldtypes.song_id, True),
		"rating": (fieldtypes.rating, True)
	}

	def post(self):
		self.rate(self.get_argument("song_id"), self.get_argument("rating"))

	def rate(self, song_id, rating):
		if not self.user.data['rate_anything']:
			acl = cache.get_station(self.sid, "user_rating_acl")
			if not cache.get_station(self.sid, "sched_current").get_song().id == song_id:
				if not song_id in acl or not self.user.id in acl[song_id]:
					raise APIException("cannot_rate_now")
			elif not self.user.is_tunedin():
				raise APIException("tunein_to_rate_current_song")
		album = ratinglib.set_song_rating(self.sid, song_id, self.user.id, rating)
		self.append_standard("rating_submitted", updated_album_ratings = [ album ], song_id = song_id, rating_user = rating)

	def clear_rating(self, song_id):
		album = ratinglib.clear_song_rating(self.sid, song_id, self.user.id)
		self.append_standard("rating_submitted", updated_album_ratings = [ album ], song_id = song_id, rating_user = None)

@handle_api_url('clear_rating')
class ClearRating(SubmitRatingRequest):
	description = "Erase a rating."
	fields = {
		"song_id": (fieldtypes.song_id, True)
	}

	def post(self):
		self.clear_rating(self.get_argument("song_id"))
