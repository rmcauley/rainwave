import random
import math
import time

from libs import db
from libs import config
from libs import cache
from libs import log
from rainwave import playlist
from rainwave import request
from rainwave.user import User

_request_interval = {}
_request_sequence = {}

class InvalidScheduleID(Exception):
	pass

class InvalidScheduleType(Exception):
	pass

class ElectionDoesNotExist(Exception):
	pass

class EventAlreadyUsed(Exception):
	pass

class InvalidElectionID(Exception):
	pass

def load_by_id(sched_id):
	event_type = db.c.fetch_var("SELECT sched_type FROM r4_schedule WHERE sched_id = %s", (sched_id,))
	if not event_type:
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE elec_id = %s", (sched_id,))
		if not elec_id:
			raise InvalidScheduleID
		return Election.load_by_id(elec_id)
	return load_by_id_and_type(sched_id, event_type)

def load_by_id_and_type(sched_id, sched_type):
	if sched_type in globals():
		return globals()[sched_type].load_by_id(sched_id)
	raise InvalidScheduleType

class Event(object):
	@classmethod
	def create(cls, sid, start, end, type = None, name = None, public = True, timed = False, url = None, use_crossfade = True, use_tag_suffix = True):
		evt = cls()
		evt.id = db.c.get_next_id("r4_schedule", "sched_id")
		evt.start = start
		evt.start_actual = None
		evt.start_predicted = None
		evt.end = end
		evt.type = evt.__class__.__name__
		evt.name = name
		evt.sid = sid
		evt.public = public
		evt.timed = timed
		evt.url = url
		evt.in_progress = False
		evt.dj_user_id = None
		evt.used = False
		evt.use_crossfade = use_crossfade
		evt.use_tag_suffix = use_tag_suffix
		db.c.update("INSERT INTO r4_schedule "
					"(sched_id, sched_start, sched_end, sched_type, sched_name, sid, sched_public, sched_timed, sched_url, sched_in_progress) VALUES "
					"(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
					(evt.id, evt.start, evt.end, evt.type, evt.name, evt.sid, evt.public, evt.timed, evt.url, evt.in_progress))

		return evt

	def __init__(self):
		self.id = None
		self.start = None
		self.start_actual = None
		self.start_predicted = None
		self.produces_elections = False
		self.dj_user_id = None
		self.use_crossfade = True
		self.use_tag_suffix = True
		self.name = None
		self.end = None
		self.url = None
		self.used = False
		self.is_election = False
		self.has_priority = False

	def _update_from_dict(self, dict):
		self.id = dict['sched_id']
		self.start = dict['sched_start']
		self.start_actual = dict['sched_start_actual']
		self.end = dict['sched_end']
		self.type = dict['sched_type']
		self.name = dict['sched_name']
		self.sid = dict['sid']
		self.public = dict['sched_public']
		self.timed = dict['sched_timed']
		self.url = dict['sched_url']
		self.used = dict['sched_used']
		self.in_progress = dict['sched_in_progress']
		self.dj_user_id = dict['sched_dj_user_id']

	def get_filename(self):
		pass

	def get_song(self):
		pass

	def finish(self):
		self.used = True
		self.in_progress = False
		self.end = int(time.time())
		db.c.update("UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s", (self.end, self.id))

		song = self.get_song()
		if song:
			song.update_last_played(self.sid)
			if ((self.sid == song.sid) or (self.sid in song.sids)):
				song.start_cooldown(self.sid)

	def length(self):
		if not self.used and hasattr(self, "songs"):
			l = 0
			for song in self.songs:
				l += song.length()
			return l
		elif self.start_actual:
			return self.start_actual - self.end
		return self.start - self.end

	def start_event(self):
		if self.in_progress and not self.used:
			return
		elif self.used:
			raise EventAlreadyUsed
		self.start_actual = int(time.time())
		self.in_progress = True
		db.c.update("UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s", (self.start_actual, self.id))

	def get_dj_user_id(self):
		return self.dj_user_id

	def to_dict(self, user = None, **kwargs):
		obj = {
			"id": self.id,
			"start": self.start,
			"start_actual": self.start_actual,
			"start_predicted": self.start_predicted,
			"end": self.end,
			"type": self.type,
			"name": self.name,
			"sid": self.sid,
			"url": self.url,
			"dj_user_id": self.dj_user_id
		}
		if user and user.data['radio_admin'] > 0:
			obj['public'] = self.public
			obj['timed'] = self.timed
		if hasattr(self, "songs"):
			if self.start_actual:
				obj['end'] = self.start_actual + self.length()
			elif self.start:
				obj['end'] = self.start + self.length()
		return obj;

class ElectionScheduler(Event):
	def __init__(self):
		super(ElectionScheduler, self).__init__()
		self.produces_elections = True

	def create_election(self, sid):
		return PVPElection.create(sid)

class PVPElectionScheduler(ElectionScheduler):
	def create_election(self, sid):
		return PVPElection.create(sid)

def add_to_election_queue(sid, song):
	db.c.update("INSERT INTO r4_election_queue (sid, song_id) VALUES (%s, %s)", (sid, song.id))

class ElecSongTypes(object):
	conflict = 0
	warn = 1
	normal = 2
	queue = 3
	request = 4

# Normal election
class Election(Event):
	@classmethod
	def load_by_id(cls, sched_id):
		elec = cls()
		row = db.c.fetch_row("SELECT * FROM r4_elections WHERE elec_id = %s", (sched_id,))
		if not row:
			raise InvalidElectionID
		elec.id = sched_id
		elec.is_election = True
		elec.type = row['elec_type']
		elec.used = row['elec_used']
		elec.start = None
		elec.start_actual = row['elec_start_actual']
		elec.start_predicted = None
		elec.in_progress = row['elec_in_progress']
		elec.sid = row['sid']
		elec.songs = []
		elec.has_priority = row['elec_priority']
		elec.public = True
		elec.timed = False
		for song_row in db.c.fetch_all("SELECT * FROM r4_election_entries WHERE elec_id = %s", (sched_id,)):
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
	def load_by_type(cls, sid, type):
		elec_id = db.c.fetch_var("SELECT elec_id FROM r4_elections WHERE elec_type = %s AND elec_used = FALSE AND sid = %s ORDER BY elec_id", (type, sid))
		if not elec_id:
			raise ElectionDoesNotExist("No election of type %s exists" % type)
		return cls.load_by_id(elec_id)

	@classmethod
	def load_unused(cls, sid):
		ids = db.c.fetch_list("SELECT elec_id FROM r4_elections WHERE elec_used = FALSE AND sid = %s ORDER BY elec_id", (sid,))
		elecs = []
		for unused_id in ids:
			elecs.append(cls.load_by_id(unused_id))
		return elecs

	@classmethod
	def create(cls, sid):
		elec_id = db.c.get_next_id("r4_schedule", "sched_id")
		elec = cls(sid)
		elec.is_election = True
		elec.id = elec_id
		elec.type = cls.__name__.lower()
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

	def fill(self, target_song_length = None):
		self._add_from_queue()
		# ONLY RUN _ADD_REQUESTS ONCE PER FILL
		self._add_requests()
		for i in range(len(self.songs), self._num_songs):
			if not target_song_length and len(self.songs) > 0 and 'length' in self.songs[0].data:
				target_song_length = self.songs[0].data['length']
				log.debug("elec_fill", "Second song in election, aligning to length %s" % target_song_length)
			song = playlist.get_random_song_timed(self.sid, target_song_length)
			song.data['entry_votes'] = 0
			song.data['entry_type'] = ElecSongTypes.normal
			song.data['elec_request_user_id'] = 0
			song.data['elec_request_username'] = None
			self._check_song_for_conflict(song)
			self.add_song(song)

	def _check_song_for_conflict(self, song):
		requesting_user = db.c.fetch_row("SELECT username, phpbb_users.user_id "
			"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN r4_request_store USING (user_id) JOIN phpbb_users USING (user_id) "
			"WHERE r4_listeners.sid = %s AND r4_request_line.sid = r4_listeners.sid AND song_id = %s "
			"ORDER BY line_wait_start LIMIT 1",
			(self.sid, song.id))
		if requesting_user:
			song.data['entry_type'] = ElecSongTypes.request
			song.data['request_username'] = requesting_user['username']
			song.data['request_user_id'] = requesting_user['user_id']
			return True

		# THE CODE BELOW DOES NOT FUNCTION WELL
		# After thinking about it I simply decided to remove it
		# It's not the most important thing to show to the user, and the vast majority of users
		# don't know what it is or are simply confused by it.
		# In an effort to simply it all, I've just decided to make users with conflicts
		# suffer the loss and move on.
		#
		# The election system itself will avoid a first-pick conflict for a user anyway.
		# Good enough in my books.
		#if song.albums and len(song.albums) > 0:
		#	for album in song.albums:
		#		conflicting_user = db.c.fetch_var("SELECT username "
		#			"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN r4_song_album ON (line_top_song_id = r4_song_album.song_id) JOIN phpbb_users ON (r4_listeners.user_id = phpbb_users.user_id) "
		#			"WHERE r4_listeners.sid = %s AND r4_request_line.sid = %s AND r4_song_album.sid = %s AND r4_song_album.album_id = %s "
		#			"ORDER BY line_wait_start LIMIT 1",
		#			(self.sid, self.sid, self.sid, album.id))
		#		if conflicting_user:
		#			song.data['entry_type'] = ElecSongTypes.conflict
		#			song.data['request_username'] = conflicting_user
		#			return True
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

	def start_event(self):
		if not self.used and not self.in_progress:
			results = db.c.fetch_all("SELECT song_id, entry_votes FROM r4_election_entries WHERE elec_id = %s", (self.id,))
			for song in self.songs:
				for song_result in results:
					if song_result['song_id'] == song.id:
						song.data['entry_votes'] = song_result['entry_votes']
				# Auto-votes for somebody's request
				if song.data['entry_type'] == ElecSongTypes.request:
					if db.c.fetch_var("SELECT COUNT(*) FROM r4_vote_history WHERE user_id = %s AND elec_id = %s", (song.data['elec_request_user_id'], self.id)) == 0:
						song.data['entry_votes'] += 1
			random.shuffle(self.songs)
			self.songs = sorted(self.songs, key=lambda song: song.data['entry_type'])
			self.songs = sorted(self.songs, key=lambda song: song.data['entry_votes'])
			self.songs.reverse()

			for i in range(0, len(self.songs)):
				self.songs[i].data['entry_position'] = i
				db.c.update("UPDATE r4_election_entries SET entry_position = %s WHERE entry_id = %s", (i, self.songs[i].data['entry_id']))
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

	def _add_from_queue(self):
		for row in db.c.fetch_all("SELECT elecq_id, song_id FROM r4_election_queue WHERE sid = %s ORDER BY elecq_id LIMIT %s" % (self.sid, self._num_songs)):
			db.c.update("DELETE FROM r4_election_queue WHERE elecq_id = %s" % (row['elecq_id'],))
			song = playlist.Song.load_from_id(row['song_id'], self.sid)
			self.add_song(song)

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
			line_length = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE sid = %s", (self.sid,))
			log.debug("requests", "Ready for sequence, line length %s" % line_length)
			# This sequence variable gets set AFTER a request has already been marked as fulfilled
			# If we have a +1 to this math we'll actually get 2 requests in a row, one now (is_request_needed will return true)
			# and then again when sequence_length will go from 1 to 0.
			_request_sequence[self.sid] = int(math.floor(line_length / config.get_station(self.sid, "request_sequence_scale")))
			_request_interval[self.sid] = config.get_station(self.sid, "request_interval")
			log.debug("requests", "Sequence length: %s" % _request_sequence[self.sid])

	def get_request(self):
		song = request.get_next(self.sid)
		if not song:
			return None
		self.reset_request_sequence()
		song.data['entry_type'] = ElecSongTypes.request
		return song

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

	def to_dict(self, user = None, check_rating_acl = False, **kwargs):
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

class PVPElection(Election):
	def __init__(self):
		self._num_requests = 2
		self._num_songs = 2

	def is_request_needed(self):
		global _request_sequence
		_request_sequence[self.sid] = 0
		return True

class OneUp(Event):
	@classmethod
	def load_by_id(cls, sched_id):
		row = db.c.fetch_row("SELECT * FROM r4_schedule JOIN r4_one_ups USING (sched_id) WHERE r4_schedule.sched_id = %s", (sched_id,))
		if not row:
			raise InvalidScheduleID
		one_up = cls()
		one_up._update_from_dict(row)
		one_up.songs = [ playlist.Song.load_from_id(row['song_id'], one_up.sid) ]
		one_up.end = one_up.start + one_up.length()
		return one_up

	@classmethod
	def create(cls, sid, start, song_id):
		song = playlist.Song.load_from_id(song_id, sid)
		one_up = super(OneUp, cls).create(sid=sid, start=start, end=start+song.data['length'], public=False)
		db.c.update("INSERT INTO r4_one_ups (sched_id, song_id) VALUES (%s, %s)", (one_up.id, song_id))
		one_up.songs = [ song ]
		return one_up

	def get_filename(self):
		return self.songs[0].filename

	def get_song(self):
		return self.songs[0]

	def length(self):
		return self.songs[0].data['length']

	def to_dict(self, user = None, **kwargs):
		obj = super(OneUp, self).to_dict(user)
		obj['songs'] = [ self.songs[0].to_dict(user) ]
		return obj

# How this works is TBD.
class OneUpSeries(object):
	def __init__(self):
		pass

	def add_song(self, song):
		pass

# Other events (Jingle, LiveShow) will be developed later.
