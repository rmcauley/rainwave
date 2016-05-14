from time import time as timestamp

from api import fieldtypes
from api.web import APIHandler
from api.exceptions import APIException
from api.server import handle_api_url
import rainwave.schedule

from libs import cache
from libs import config
from libs import log
from libs import db
from libs import zeromq

def append_success_to_request(request, elec_id, entry_id):
	request.append_standard("vote_submitted", return_name="vote_result", elec_id=elec_id, entry_id=entry_id)

@handle_api_url("vote")
class SubmitVote(APIHandler):
	return_name = "vote_result"
	tunein_required = True
	description = "Vote for a candidate in an election.  Cannot cancel/delete a vote.  If user has already voted, the vote will be changed to the submitted song."
	fields = { "entry_id": (fieldtypes.integer, True) }
	sync_across_sessions = True

	def post(self):
		lock_count = 0
		voted = False
		elec_id = None
		for event in cache.get_station(self.sid, "sched_next"):
			lock_count += 1
			if event.is_election and event.has_entry_id(self.get_argument("entry_id")) and len(event.songs) > 1:
				elec_id = event.id
				voted = self.vote(self.get_argument("entry_id"), event, lock_count)
				break
			if not self.user.data['perks']:
				break
		if voted:
			append_success_to_request(self, elec_id, self.get_argument("entry_id"))
		else:
			self.append_standard("cannot_vote_for_this_now", success=False, elec_id=elec_id, entry_id=self.get_argument("entry_id"))

	# this will never get executed for WebSocket connections, so this code
	# is duplicated in sync.py
	def on_finish(self):
		live_voting = rainwave.schedule.update_live_voting(self.sid)
		zeromq.publish({ "action": "live_voting", "sid": self.sid, "uuid_exclusion": None, "data": { "live_voting": live_voting } })
		super(SubmitVote, self).on_finish()

	def vote(self, entry_id, event, lock_count):
		# Subtract a previous vote from the song's total if there was one
		already_voted = False
		if self.user.is_anonymous():
			# log.debug("vote", "Anon already voted: %s" % (self.user.data['voted_entry'],))
			if self.user.data['voted_entry'] and self.user.data['voted_entry'] == entry_id:
				# immediately return and a success will be registered
				return True
			if self.user.data['voted_entry']:
				already_voted = self.user.data['voted_entry']
		else:
			previous_vote = db.c.fetch_row("SELECT entry_id, vote_id, song_id FROM r4_vote_history WHERE user_id = %s AND elec_id = %s", (self.user.id, event.id))
			# log.debug("vote", "Already voted: %s" % repr(already_voted))
			if previous_vote and previous_vote['entry_id'] == entry_id:
				# immediately return and a success will be registered
				return True
			elif previous_vote:
				already_voted = previous_vote['entry_id']

		db.c.start_transaction()
		try:
			if already_voted:
				if not event.add_vote_to_entry(already_voted, -1):
					log.warn("vote", "Could not subtract vote from entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], already_voted))
					raise APIException("internal_error")

			# If this is a new vote, we need to check to make sure the listener is not locked.
			if not already_voted and self.user.data['lock'] and self.user.data['lock_sid'] != self.sid:
				raise APIException("user_locked", "User locked to %s for %s more songs." % (config.station_id_friendly[self.user.data['lock_sid']], self.user.data['lock_counter']))
			# Issue the listener lock (will extend a lock if necessary)
			if not self.user.lock_to_sid(self.sid, lock_count):
				log.warn("vote", "Could not lock user: listener ID %s voting for entry ID %s, tried to lock for %s events." % (self.user.data['listener_id'], entry_id, lock_count))
				raise APIException("internal_error", "Internal server error.  User is now locked to station ID %s." % self.sid)

			if self.user.is_anonymous():
				if not db.c.update("UPDATE r4_listeners SET listener_voted_entry = %s WHERE listener_id = %s", (entry_id, self.user.data['listener_id'])):
					log.warn("vote", "Could not set voted_entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
					raise APIException("internal_error")
				self.user.update({ "voted_entry": entry_id })
			else:
				if already_voted:
					db.c.update("UPDATE r4_vote_history SET song_id = %s, entry_id = %s WHERE user_id = %s and entry_id = %s", (event.get_entry(entry_id).id, entry_id, self.user.id, already_voted))
				else:
					time_window = int(timestamp()) - 1209600
					vote_count = db.c.fetch_var("SELECT COUNT(vote_id) FROM r4_vote_history WHERE vote_time > %s AND user_id = %s", (time_window, self.user.id))
					db.c.execute("SELECT user_id, COUNT(song_id) AS c FROM r4_vote_history WHERE vote_time > %s GROUP BY user_id HAVING COUNT(song_id) > %s", (time_window, vote_count))
					rank = db.c.rowcount + 1
					db.c.update(
						"INSERT INTO r4_vote_history (elec_id, entry_id, user_id, song_id, vote_at_rank, vote_at_count, sid) "
						"VALUES (%s, %s, %s, %s, %s, %s, %s)",
						(event.id, entry_id, self.user.id, event.get_entry(entry_id).id, rank, vote_count, event.sid))
					db.c.update("UPDATE phpbb_users SET radio_inactive = FALSE, radio_last_active = %s, radio_totalvotes = %s WHERE user_id = %s", (timestamp(), vote_count, self.user.id))

					autovoted_entry = event.has_request_by_user(self.user.id)
					if autovoted_entry:
						event.add_vote_to_entry(autovoted_entry.data['entry_id'], -1)

				user_vote_cache = cache.get_user(self.user, "vote_history")
				if not user_vote_cache:
					user_vote_cache = []
				found = False
				for voted in user_vote_cache:
					if voted[0] == event.id:
						found = True
						voted[1] = entry_id
				while len(user_vote_cache) > 5:
					user_vote_cache.pop(0)
				if not found:
					user_vote_cache.append([event.id, entry_id])
				cache.set_user(self.user, "vote_history", user_vote_cache)

			# Register vote
			if not event.add_vote_to_entry(entry_id):
				log.warn("vote", "Could not add vote to entry: listener ID %s voting for entry ID %s." % (self.user.data['listener_id'], entry_id))
				raise APIException("internal_error")
			db.c.commit()
		except:
			db.c.rollback()
			raise

		return True
