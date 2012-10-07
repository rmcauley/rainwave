import random
import math
import time

from libs import db
from libs import config
from libs import cache
from libs import log
from rainwave import playlist
from rainwave import request

"""
Election.create
	- Timing
	- No timing
Election.fill
Election._check_song_for_conflict
	- Album conflict
	- Direct conflict
Election.add_song
Election.start
	- Start
	- After in progress already
	- After used
Election.get_filename
Election.get_song
Election._add_from_queue
Election.add_requests
Election.is_request_needed
	- Nobody in line, no requests done yet
	- Request due, nobody in line
	- Request due, 1 person
	- Request due, config.get_station(self.sid, "request_interval_scale")
	- Request due, config.get_station etc * 2
Election.get_request
Election.length
	- Before use
	- After use
Election.finish
"""

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
		raise InvalidScheduleID
	load_by_id_and_type(sched_id, event_type)
	
def load_by_id_and_type(sched_id, sched_type):
	if sched_type == EventTypes.election:
		return Election.load_by_id(sched_id)
	raise InvalidScheduleType

class Event(object):
	@classmethod
	def create(cls, sid, start, end, type = None, name = None, public = True, timed = False, url = None, use_crossfade = True, use_tag_suffix = True):
		evt = cls()
		evt.id = db.c.get_next_id("r4_schedule", "sched_id")
		evt.start = start
		evt.start_actual = None
		evt.end = end
		if type:
			evt.type = type
		else:
			evt.type = evt.__class__.__name__
		evt.name = name
		evt.sid = sid
		evt.public = public
		evt.timed = timed
		evt.url = url
		evt.in_progress = False
		evt.dj_user_id = None
		evt.use_crossfade = use_crossfade
		evt.use_tag_suffix = use_tag_suffix
		db.c.update("INSERT INTO r4_schedule "
					"(sched_id, sched_start, sched_end, sched_type, sched_name, sid, sched_public, sched_timed, sched_url, sched_in_progress) VALUES "
					"(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s",
					(evt.id, evt.start, evt.end, evt.type, evt.name, evt.sid, evt.public, evt.timed, evt.url, evt.in_progress))

	def __init__(self):
		self.id = None
		self.start = None
		self.produces_elections = False
		self.dj_user_id = None
		self.use_crossfade = True
		self.use_tag_suffix = True
		self.name = None
	
	def _update_from_dict(self, dict):
		self.start = dict['sched_start']
		self.start_actual = dict['sched_start_actual']
		self.end = dict['sched_end']
		self.type = dict['sched_type']
		self.name = dict['sched_name']
		self.sid = dict['sid']
		self.public = dict['sched_public']
		self.timed = dict['sched_timed']
		self.url = dict['sched_url']
		self.in_progress = dict['sched_in_progress']
		self.dj_user_id = dict['sched_dj_user_id']
	
	def get_filename(self):
		pass
		
	def get_song(self):
		pass
	
	def finish(self):
		self.used = True
		self.in_progress = False
		db.c.update("UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s", (time.time(), self.id))
		
		song = self.get_song()
		if song:
			song.update_last_played(self.sid)
		
	def get_song(self):
		return None	
		
	def length(self):
		if self.start_actual:
			return self.start_actual - self.end
		return self.start - self.end
		
	def start_event(self):
		if self.in_progress and not self.used:
			return
		elif self.used:
			raise EventAlreadyUsed
		self.start_actual = time.time()
		self.in_progress = True
		db.c.update("UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s", (self.start_actual, self.id))
		
	def get_dj_user_id(self):
		return self.dj_user_id
		
class ElectionScheduler(Event):
	def __init__(self):
		super(Event, self).__init__()
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
	def load_by_id(cls, id):
		elec = cls()
		row = db.c.fetch_row("SELECT * FROM r4_elections WHERE elec_id = %s", (id,))
		if not row:
			raise InvalidElectionID
		elec.id = id
		elec.is_election = True
		elec.type = row['elec_type']
		elec.used = row['elec_used']
		elec.start = None
		elec.start_actual = row['elec_start_actual']
		elec.in_progress = row['elec_in_progress']
		elec.sid = row['sid']
		elec.songs = []
		elec.priority = row['elec_priority']
		for song_row in db.c.fetch_all("SELECT * FROM r4_election_entries WHERE elec_id = %s", (id,)):
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
		for id in ids:
			elecs.append(cls.load_by_id(id))
		return elecs
	
	@classmethod
	def create(cls, sid):
		elec_id = db.c.get_next_id("r4_elections", "elec_id")
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
		elec.priority = False
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
			song = playlist.get_random_song(self.sid, target_song_length)
			song.data['entry_votes'] = 0
			song.data['entry_type'] = ElecSongTypes.normal
			song.data['elec_request_user_id'] = 0
			song.data['elec_request_username'] = None
			self._check_song_for_conflict(song)
			self.add_song(song)
			
	def _check_song_for_conflict(self, song):
		requesting_user = db.c.fetch_var("SELECT username "
			"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN r4_request_store USING (user_id) JOIN phpbb_users USING (user_id) "
			"WHERE r4_listeners.sid = %s AND r4_request_line.sid = r4_listeners.sid AND song_id = %s "
			"ORDER BY line_wait_start LIMIT 1",
			(self.sid, song.id))
		if requesting_user:
			song.data['entry_type'] = ElecSongTypes.request
			song.data['request_username'] = requesting_user
			return True
		if song.albums and len(song.albums) > 0:
			for album in song.albums:
				conflicting_user = db.c.fetch_var("SELECT username "
					"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN r4_song_album ON (line_top_song_id = r4_song_album.song_id) JOIN phpbb_users ON (r4_listeners.user_id = phpbb_users.user_id) "
					"WHERE r4_listeners.sid = %s AND r4_request_line.sid = %s AND r4_song_album.sid = %s AND r4_song_album.album_id = %s "
					"ORDER BY line_wait_start LIMIT 1",
					(self.sid, self.sid, self.sid, album.id))
				if conflicting_user:
					song.data['entry_type'] = ElecSongTypes.conflict
					song.data['request_username'] = conflicting_user
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
		song.start_block(self.sid, "in_election", config.get_station(self.sid, "elec_block_length"))
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
			self.start_actual = time.time()
			self.in_progress = True
			db.c.update("UPDATE r4_elections SET elec_in_progress = TRUE, elec_start_actual = %s WHERE elec_id = %s", (self.start_actual, self.id))
	
	def get_filename(self):
		return self.songs[0].filename
		
	def get_song(self):
		return self.songs[0]
		
	def _add_from_queue(self):
		for row in db.c.fetch_all("SELECT elecq_id, song_id FROM r4_election_queue WHERE sid = %s ORDER BY elecq_id LIMIT %s" % (self.sid, self._num_songs)):
			db.c.update("DELETE FROM r4_election_queue WHERE elecq_id = %s" % (row['elecq_id'],))
			song = playlist.Song.load_from_id(row['song_id'], self.sid)
			self.add_song(song)
			
	def _add_requests(self):
		# ONLY RUN IS_REQUEST_NEEDED ONCE
		if self.is_request_needed() and len(self.songs) < self._num_songs:
			for i in range(1, self._num_requests):
				self.add_song(self.get_request())
			if len(self.songs) > 0:
				request.update_all_list()
		
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
				
		# If we're ready for a request sequence, start one
		return_value = None
		if _request_interval[self.sid] <= 0 and _request_sequence[self.sid] <= 0:
			line_length = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE sid = %s", (self.sid,))
			_request_sequence[self.sid] = 1 + math.floor(line_length / config.get_station(self.sid, "request_interval_scale"))
			_request_interval[self.sid] = config.get_station(self.sid, "request_interval_gap")
			return_value = True
		# If we are in a request sequence, do one
		elif _request_sequence[self.sid] > 0:
			return_value = True
		else:
			_request_interval[self.sid] -= 1
			return_value = False

		cache.set_station(self.sid, "request_interval", _request_interval[self.sid])
		cache.set_station(self.sid, "request_sequence", _request_sequence[self.sid])
		return return_value
		
	def get_request(self):
		song = request.get_next(self.sid)
		if not song:
			return None
		song.data['entry_type'] = ElecSongTypes.request
		return song		
		
	def length(self):
		if self.used:
			return self.songs[0].data['length']
		else:
			totalsec = 0
			for song in self.songs:
				totalsec += song.data['length']
			return math.floor(totalsec / len(self.songs))
		
	def finish(self):
		self.in_progress = False
		self.used = True
		db.c.update("UPDATE r4_elections SET elec_used = TRUE, elec_in_progress = FALSE WHERE elec_id = %s", (self.id,))
		
		self.songs[0].add_to_vote_count(self.songs[0].data['entry_votes'], self.sid)
		self.songs[0].update_last_played(self.sid)
		self.songs[0].start_cooldown(self.sid)
	
	def set_priority(self, priority):
		# Do not update the actual local priority variable, that may be needed
		# for sorting purposes
		if priority:
			db.c.update("UPDATE r4_elections SET elec_priority = TRUE WHERE elec_id = %s", (self.id,))
		else:
			db.c.update("UPDATE r4_elections SET elec_priority = FALSE WHERE elec_id = %s", (self.id,))
		
class PVPElection(Election):
	def __init__(self):
		self._num_requests = 2
		self._num_songs = 2
	
	def is_request_needed(self):
		return True
		
class OneUp(Event):
	@classmethod
	def load_event_by_id(cls, id):
		row = db.c.fetch_row("SELECT * FROM r4_schedule JOIN r4_one_ups USING (sched_id) WHERE r4_schedule.sched_id = %s", (id,))
		one_up = cls()
		one_up._update_from_dict(row)
		one_up.songs = [ playlist.Song.load_from_id(id, one_up.sid) ]
		
	@classmethod
	def create(cls, sid, start, song_id):
		song = playlist.Song.load_from_id(id, sid)
		one_up = super(Event, cls).create(sid=sid, start=start, end=start+song.length, public=False)
		one_up.songs = [ song ]

	def get_filename(self):
		return self.songs[0].filename
		
	def get_song(self):
		return self.songs[0]
		
	def length(self):
		return self.songs[0].length

# How this works is TBD.
class OneUpSeries(object):
	def __init__(self):
		pass
		
	def add_song(self, song):
		pass

# Other events (Jingle, LiveShow) will be developed later.
