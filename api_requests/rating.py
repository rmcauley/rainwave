from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_url
import api.returns

from libs import cache
from libs import log
from rainwave import playlist

@handle_url('rate')
class SubmitRating(RequestHandler):
	return_name = "rate_result"
	login_required = True
	tunein_required = False
	unlocked_listener_only = True
	description = "Rate a song."
	fields = {
		"song_id": (fieldtypes.integer, True),
		"rating": (fieldtypes.rating, True)
	}
	
	def get(self):
		if self.rate(self, song_id, rating):
			self.append(self.return_name, { "code": 0, "text": "Rating submitted." })
		else:
			self.append(self.return_name, { "code": -1, "text": "Rating failed." })
	
	def rate(self, song_id, rating):
		db.c.update("UPDATE r4_listeners SET listener_voted_entry = %s WHERE listener_id = %s", (entry_id, self.user.data['listener_id']))
		
		if not db.c.update("UPDATE r4_listeners SET listener_voted_entry = %s WHERE listener_id = %s", (entry_id, self.user.data['listener_id'])):
			log.warn("vote", "Could not set voted_entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
			self.append(self.return_name, api.returns.ErrorReturn(0, "Internal server error. (logged)", { "entry_id": entry_id, "try_again": True }))
			return False
		return True

