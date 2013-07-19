from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api.returns

from libs import cache
from libs import log
from rainwave import playlist
from rainwave import rating as ratinglib

@handle_api_url('rate')
class SubmitRating(RequestHandler):
	sid_required = True
	return_name = "rate_result"
	login_required = True
	tunein_required = False
	unlocked_listener_only = False
	description = "Rate a song."
	fields = {
		"song_id": (fieldtypes.integer, True),
		"rating": (fieldtypes.rating, True)
	}
	
	def post(self):
		result = self.rate(self.get_argument("song_id"), self.get_argument("rating"))
		result.update({ "song_id": self.get_argument("song_id"), "user_rating": self.get_argument("rating") })
		self.append(self.return_name, result)

	def rate(self, song_id, rating):
		acl = cache.get_station(self.sid, "user_rating_acl")
		if not song_id in acl or not self.user.id in acl[song_id]:
			return { "code": 0, "text": "Cannot rate that song at this time." }
		albums = ratinglib.set_song_rating(song_id, self.user.id, rating)
		return { "code": 1, "text": "Rating successful.", "updated_album_ratings": albums }

