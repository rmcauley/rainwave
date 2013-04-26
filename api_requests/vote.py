import time

from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api.returns

from libs import cache
from libs import log
from libs import db
from rainwave import playlist

@handle_api_url("vote")
class SubmitVote(RequestHandler):
	return_name = "vote_result"
	tunein_required = True
	unlocked_listener_only = True
	description = "Vote for a candidate in an election."
	fields = { "entry_id": (fieldtypes.integer, True) }
	
	def post(self):
		events = cache.get_station(self.sid, "sched_next")
		lock_count = 0
		vote_code = 0
		vote_string = "Could not find entry_id in future events."
		try_again = False
		for event in events:
			lock_count += 1
			if event.is_election and event.has_entry_id(self.get_argument("entry_id")):
				(vote_code, vote_string, try_again) = self.vote(self.get_argument("entry_id"), event, lock_count)
				break
			if not self.user.data['radio_perks']:
				break
		self.append(self.return_name, { "code": vote_code, "text": vote_string, "entry_id": self.get_argument("entry_id"), "try_again": try_again })
		
	def vote(self, entry_id, event, lock_count):
		if not self.user.lock_to_sid(self.sid, lock_count):
			log.warn("vote", "Could not lock user: listener ID %s voting for entry ID %s, tried to lock for %s events." % (self.user.data['listener_id'], entry_id, lock_count))
			return (0, "Internal server error. (logged)", True)
		
		vote_id = None
		song = event.get_entry(entry_id)
		if self.user.data['listener_voted_entry']:
			if not event.add_vote_to_entry(entry_id, -1):
				log.warn("vote", "Could not subtract vote from entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
				return (0, "Internal server error. (logged)", True)
			if not self.user.is_anonymous():
				vote_id = db.c.fetch_var("SELECT vote_id FROM r4_vote_history WHERE user_id = %s AND song_id = %s ORDER BY vote_id DESC LIMIT 1", (self.user.id, song.id))
			
		if not db.c.update("UPDATE r4_listeners SET listener_voted_entry = %s WHERE listener_id = %s", (entry_id, self.user.data['listener_id'])):
			log.warn("vote", "Could not set voted_entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
			return (0, "Internal server error. (logged)", True)
		self.user.update({ "listener_voted_entry": entry_id })
		
		if not event.add_vote_to_entry(entry_id):
			log.warn("vote", "Could not add vote to entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
			return (0, "Internal server error. (logged)", True)
		
		if not self.user.is_anonymous():
			if vote_id:
				db.c.update("UPDATE r4_vote_history SET song_id = %s WHERE vote_id = %s", (song.id, vote_id))
			else:
				db.c.update("UPDATE phpbb_users SET radio_totalvotes = radio_totalvotes + 1 WHERE user_id = %s", (self.user.id,))
				self.user.update({ "radio_totalvotes": self.user.data['radio_totalvotes'] + 1 })
		
				timewindow = int(time.time()) - 1209600
				db.c.query("SELECT user_id, COUNT(song_id) AS c FROM rw_vote_history WHERE vote_time > %s GROUP BY user_id HAVING COUNT(song_id) > %s", (timewindow, self.user.data['radio_totalvotes']))
				rank = db.c.rowcount + 1
				db.c.update(
					"INSERT INTO r4_vote_history (elec_id, user_id, song_id, vote_at_rank, vote_at_count) "
					"VALUES (%s, %s, %s, %s, %s)",
					(event.id, self.user.id, song.id, rank, self.user.data['radio_totalvotes']))
		
		return (1, "Vote successful.", False)
