import random
import math
import time

from libs import db
from libs import config
from libs import cache
from libs import log
from rainwave import playlist
from rainwave import request
from rainwave.events import event

_request_interval = {}
_request_sequence = {}

class ElecSongTypes(object):
	conflict = 0
	warn = 1
	normal = 2
	queue = 3
	request = 4

class InvalidElectionID(Exception):
	pass

class ElectionDoesNotExist(Exception):
	pass

class ElectionEmptyException(Exception):
	pass

def force_request(sid):
	global _request_interval
	global _request_sequence
	_request_interval[sid] = 0
	_request_sequence[sid] = 0

@event.register_producer
class ElectionProducer(event.BaseProducer):
	def __init__(self, sid):
		super(ElectionProducer, self).__init__(sid)
		self.plan_ahead_limit = config.get_station(sid, "num_planned_elections")
		self.elec_type = "Election"
		self.elec_class = Election

	def load_next_event(self, target_length = None, min_elec_id = 0, skip_requests = False):
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE elec_type = %s and elec_used = FALSE AND sid = %s AND elec_id > %s ORDER BY elec_id LIMIT 1", (self.elec_type, self.sid, min_elec_id))
		if elec_id:
			elec = self.elec_class.load_by_id(elec_id)
			elec.url = self.url
			elec.name = self.name
			return elec
		else:
			return self._create_election(target_length, skip_requests)

	def load_event_in_progress(self):
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE elec_type = %s AND elec_in_progress = TRUE AND sid = %s ORDER BY elec_id DESC LIMIT 1", (self.elec_type, self.sid))
		if elec_id:
			elec = self.elec_class.load_by_id(elec_id)
			elec.name = self.name
			elec.url = self.url
			return elec
		else:
			return self.load_next_event()

	def _create_election(self, target_length, skip_requests):
		log.debug("create_elec", "Creating election type %s for sid %s, target length %s." % (self.elec_type, self.sid, target_length))
		db.c.start_transaction()
		try:
			elec = self.elec_class.create(self.sid)
			elec.url = self.url
			elec.name = self.name
			elec.fill(target_length, skip_requests)
			if elec.length() == 0:
				raise Exception("Created zero-length election.")
			db.c.commit()
			return elec
		except:
			db.c.rollback()
			raise

# Normal election
class Election(event.BaseEvent):
	@classmethod
	def load_by_id(cls, elec_id):
		elec = cls()
		row = db.c.fetch_row("SELECT * FROM r4_elections WHERE elec_id = %s", (elec_id,))
		if not row:
			raise InvalidElectionID
		elec.id = elec_id
		elec.is_election = True
		elec.type = row['elec_type']
		elec.used = row['elec_used']
		elec.start = None
		elec.start_actual = row['elec_start_actual']
		elec.in_progress = row['elec_in_progress']
		elec.sid = row['sid']
		elec.songs = []
		elec.has_priority = row['elec_priority']
		elec.public = True
		elec.timed = False
		for song_row in db.c.fetch_all("SELECT * FROM r4_election_entries WHERE elec_id = %s", (elec_id,)):
			song = playlist.Song.load_from_id(song_row['song_id'], elec.sid)
			song.data['entry_id'] = song_row['entry_id']
			song.data['entry_type'] = song_row['entry_type']
			song.data['entry_position'] = song_row['entry_position']
			song.data['entry_votes'] = song_row['entry_votes']
			if song.data['entry_type'] != ElecSongTypes.normal:
				song.data['elec_request_user_id'] = 0
				song.data['elec_request_username'] = None
			elec.songs.append(song)
		return elec

	@classmethod
	def create(cls, sid):
		elec_id = db.c.get_next_id("r4_schedule", "sched_id")
		elec = cls(sid)
		elec.is_election = True
		elec.id = elec_id
		elec.type = "Election"
		elec.used = False
		elec.start_actual = None
		elec.in_progress = False
		elec.sid = sid
		elec.start = None
		elec.songs = []
		elec.has_priority = False
		elec.public = True
		elec.timed = True
		db.c.update("INSERT INTO r4_elections (elec_id, elec_used, elec_type, sid) VALUES (%s, %s, %s, %s)", (elec_id, False, elec.type, elec.sid))
		return elec

	def __init__(self, sid = None):
		super(Election, self).__init__()
		self._num_requests = 1
		if sid:
			self._num_songs = config.get_station(sid, "songs_in_election")
		else:
			self._num_songs = 3
		self.is_election = True

	def fill(self, target_song_length = None, skip_requests = False):
		# ONLY RUN _ADD_REQUESTS ONCE PER FILL
		if not skip_requests:
			self._add_requests()
		for i in range(len(self.songs), self._num_songs):
			try:
				if not target_song_length and len(self.songs) > 0 and 'length' in self.songs[0].data:
					target_song_length = self.songs[0].data['length']
					log.debug("elec_fill", "Second song in election, aligning to length %s" % target_song_length)
				song = self._fill_get_song(target_song_length)
				song.data['entry_votes'] = 0
				song.data['entry_type'] = ElecSongTypes.normal
				song.data['elec_request_user_id'] = 0
				song.data['elec_request_username'] = None
				self._check_song_for_conflict(song)
				self.add_song(song)
			except Exception as e:
				log.exception("elec_fill", "Song failed to fill in an election.", e)
				pass
		if len(self.songs) == 0:
			raise ElectionEmptyException

	def _fill_get_song(self, target_song_length):
		return playlist.get_random_song_timed(self.sid, target_song_length)

	def _check_song_for_conflict(self, song):
		requesting_user = db.c.fetch_row(
			"SELECT username, phpbb_users.user_id AS user_id "
				"FROM r4_request_store "
					"JOIN r4_listeners ON (r4_request_store.user_id = r4_listeners.user_id AND r4_listeners.sid = %s) "
					"JOIN r4_request_line ON (r4_listeners.user_id = r4_request_line.user_id AND r4_listeners.sid = r4_request_line.sid) "
					"JOIN phpbb_users ON (r4_request_line.user_id = phpbb_users.user_id) "
				"WHERE r4_request_store.song_id = %s "
				"ORDER BY line_wait_start LIMIT 1",
			(self.sid, song.id))
		if requesting_user:
			song.data['entry_type'] = ElecSongTypes.request
			song.data['request_username'] = requesting_user['username']
			song.data['request_user_id'] = requesting_user['user_id']
			return True
		return False

	def add_song(self, song):
		if not song:
			return False
		entry_id = db.c.get_next_id("r4_election_entries", "entry_id")
		song.data['entry_id'] = entry_id
		song.data['entry_position'] = len(self.songs)
		if not 'entry_type' in song.data:
			song.data['entry_type'] = ElecSongTypes.normal
		db.c.update("INSERT INTO r4_election_entries (entry_id, song_id, elec_id, entry_position, entry_type) VALUES (%s, %s, %s, %s, %s)", (entry_id, song.id, self.id, len(self.songs), song.data['entry_type']))
		song.start_election_block(self.sid, config.get_station(self.sid, "num_planned_elections") + 1)
		self.songs.append(song)
		return True

	def prepare_event(self):
		results = db.c.fetch_all("SELECT song_id, entry_votes FROM r4_election_entries WHERE elec_id = %s", (self.id,))
		for song in self.songs:
			for song_result in results:
				if song_result['song_id'] == song.id:
					song.data['entry_votes'] = song_result['entry_votes']
			if not 'entry_votes' in song.data:
				song.data['entry_votes'] = 0
			# Auto-votes for somebody's request
			if song.data['entry_type'] == ElecSongTypes.request:
				if db.c.fetch_var("SELECT COUNT(*) FROM r4_vote_history WHERE user_id = %s AND elec_id = %s", (song.data['elec_request_user_id'], self.id)) == 0:
					song.data['entry_votes'] += 1
		random.shuffle(self.songs)
		self.songs = sorted(self.songs, key=lambda song: song.data['entry_type'])
		self.songs = sorted(self.songs, key=lambda song: song.data['entry_votes'])
		self.songs.reverse()
		self.replay_gain = self.songs[0].replay_gain

	def start_event(self):
		# at this point, self.songs[0] is the winner
		if not self.used and not self.in_progress:
			total_votes = 0
			for i in range(0, len(self.songs)):
				self.songs[i].data['entry_position'] = i
				total_votes += self.songs[i].data['entry_votes']
				db.c.update("UPDATE r4_election_entries SET entry_position = %s WHERE entry_id = %s", (i, self.songs[i].data['entry_id']))
			if total_votes > 0:
				for song in self.songs:
					db.c.update("UPDATE r4_songs SET "
						"song_vote_share = ((song_vote_count + %s) / (song_votes_seen + %s)), "
						"song_vote_count = song_vote_count + %s, "
						"song_votes_seen = song_votes_seen + %s "
						"WHERE song_id = %s",
						 (song.data['entry_votes'], total_votes, song.data['entry_votes'], total_votes, song.id))
					for album in song.albums:
						db.c.update("UPDATE r4_album_sid SET "
							"album_vote_share = ((album_vote_count + %s) / (album_votes_seen + %s)), "
							"album_vote_count = album_vote_count + %s, "
							"album_votes_seen = album_votes_seen + %s "
							"WHERE album_id = %s AND sid = %s",
							 (song.data['entry_votes'], total_votes, song.data['entry_votes'], total_votes, album.id, self.sid))
					if 'elec_request_user_id' in song.data:
						if song == self.songs[0]:
							db.c.update("UPDATE phpbb_users SET radio_winningrequests = radio_winningrequests + 1 WHERE user_id = %s", (song.data['elec_request_user_id'],))
						else:
							db.c.update("UPDATE phpbb_users SET radio_losingrequests = radio_losingrequests + 1 WHERE user_id = %s", (song.data['elec_request_user_id'],))

			if db.c.allows_join_on_update and len(self.songs) > 0:
				db.c.update("UPDATE phpbb_users SET radio_winningvotes = radio_winningvotes + 1 FROM r4_vote_history WHERE elec_id = %s AND song_id = %s AND phpbb_users.user_id = r4_vote_history.user_id", (self.id, self.songs[0].id))
				db.c.update("UPDATE phpbb_users SET radio_losingvotes = radio_losingvotes + 1 FROM r4_vote_history WHERE elec_id = %s AND song_id != %s AND phpbb_users.user_id = r4_vote_history.user_id", (self.id, self.songs[0].id))
		self.start_actual = int(time.time())
		self.in_progress = True
		self.used = True
		db.c.update("UPDATE r4_elections SET elec_in_progress = TRUE, elec_start_actual = %s, elec_used = TRUE WHERE elec_id = %s", (self.start_actual, self.id))

	def get_filename(self):
		if len(self.songs) == 0:
			return None
		return self.songs[0].filename

	def get_song(self):
		if len(self.songs) == 0:
			return None
		return self.songs[0]

	def _add_requests(self):
		# ONLY RUN IS_REQUEST_NEEDED ONCE
		if self.is_request_needed() and len(self.songs) < self._num_songs:
			log.debug("requests", "Ready for requests, filling %s." % self._num_requests)
			for i in range(0, self._num_requests):
				self.add_song(self.get_request())

	def is_request_needed(self):
		global _request_interval
		global _request_sequence
		if not self.sid in _request_interval:
			_request_interval[self.sid] = cache.get_station(self.sid, "request_interval")
			if not _request_interval[self.sid]:
				_request_interval[self.sid] = 0
		if not self.sid in _request_sequence:
			_request_sequence[self.sid] = cache.get_station(self.sid, "request_sequence")
			if not _request_sequence[self.sid]:
				_request_sequence[self.sid] = 0
		log.debug("requests", "Interval %s // Sequence %s" % (_request_interval, _request_sequence))

		# If we're ready for a request sequence, start one
		return_value = None
		if _request_interval[self.sid] <= 0 and _request_sequence[self.sid] <= 0:
			return_value = True
		# If we are in a request sequence, do one
		elif _request_sequence[self.sid] > 0:
			_request_sequence[self.sid] -= 1
			log.debug("requests", "Still in sequence.  Remainder: %s" % _request_sequence[self.sid])
			return_value = True
		else:
			_request_interval[self.sid] -= 1
			log.debug("requests", "Waiting on interval.  Remainder: %s" % _request_interval[self.sid])
			return_value = False

		cache.set_station(self.sid, "request_interval", _request_interval[self.sid])
		cache.set_station(self.sid, "request_sequence", _request_sequence[self.sid])
		return return_value

	def reset_request_sequence(self):
		if _request_interval[self.sid] <= 0 and _request_sequence[self.sid] <= 0:
			line_length = len(cache.get_station(self.sid, "request_line"))
			# line_length = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE sid = %s", (self.sid,))
			log.debug("requests", "Ready for sequence, line length %s" % line_length)
			# This sequence variable gets set AFTER a request has already been marked as fulfilled
			# If we have a +1 to this math we'll actually get 2 requests in a row, one now (is_request_needed will return true)
			# and then again when sequence_length will go from 1 to 0.
			_request_sequence[self.sid] = int(math.floor(line_length / config.get_station(self.sid, "request_sequence_scale")))
			_request_interval[self.sid] = config.get_station(self.sid, "request_interval")
			log.debug("requests", "Sequence length: %s" % _request_sequence[self.sid])

	def get_request(self):
		song = self._get_request_function()
		if not song:
			return None
		self.reset_request_sequence()
		song.data['entry_type'] = ElecSongTypes.request
		return song

	def _get_request_function(self):
		return request.get_next(self.sid)

	def length(self):
		if self.used or self.in_progress:
			if len(self.songs) == 0:
				return 0
			else:
				return self.songs[0].data['length']
		else:
			totalsec = 0
			for song in self.songs:
				totalsec += song.data['length']
			if totalsec == 0:
				return 0
			return math.floor(totalsec / len(self.songs))

	def finish(self):
		self.in_progress = False
		self.used = True

		db.c.update("UPDATE r4_elections SET elec_in_progress = FALSE, elec_used = TRUE WHERE elec_id = %s", (self.id,))

		if len(self.songs) > 0:
			self.songs[0].add_to_vote_count(self.songs[0].data['entry_votes'], self.sid)
			self.songs[0].update_last_played(self.sid)
			self.songs[0].update_rating()
			self.songs[0].start_cooldown(self.sid)

	def set_priority(self, priority):
		if priority:
			db.c.update("UPDATE r4_elections SET elec_priority = TRUE WHERE elec_id = %s", (self.id,))
		else:
			db.c.update("UPDATE r4_elections SET elec_priority = FALSE WHERE elec_id = %s", (self.id,))
		self.has_priority = priority

	def to_dict(self, user = None, check_rating_acl = False):
		obj = super(Election, self).to_dict(user)
		obj['used'] = self.used
		obj['length'] = self.length()
		obj['songs'] = []
		for song in self.songs:
			if check_rating_acl and not user.is_anonymous():
				song.check_rating_acl(user)
			obj['songs'].append(song.to_dict(user))
		return obj

	def has_entry_id(self, entry_id):
		for song in self.songs:
			if song.data['entry_id'] == entry_id:
				return True
		return False

	def get_entry(self, entry_id):
		for song in self.songs:
			if song.data['entry_id'] == entry_id:
				return song
		return None

	def add_vote_to_entry(self, entry_id, addition = 1):
		# I hope you've verified this entry belongs to this event, cause I don't do that here.. :)
		return db.c.update("UPDATE r4_election_entries SET entry_votes = entry_votes + %s WHERE entry_id = %s", (addition, entry_id))

	def delete(self):
		return db.c.update("DELETE FROM r4_elections WHERE elec_id = %s", (self.id,))
