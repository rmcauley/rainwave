import random
import math

from libs import db
from libs import config
from libs import constants
from libs import cache
from rainwave import playlist

_request_interval = {}
_request_sequence = {}

class ElectionTypes(Object):
	normal = "normal"
	
class EventTypes(Object):
	election = "election"
	
class InvalidScheduleID(Exception):
	pass
	
class InvalidScheduleType(Exception):
	pass

def load_by_id(sched_id):
	event_type = db.c.fetch_var("SELECT sched_type FROM r4_schedule WHERE sched_id = %s", (sched_id,))
	if not event_type:
		raise InvalidScheduleID
	load_by_id_and_type(sched_id, event_type)
	
def load_by_id_and_type(sched_id, sched_type):
	if sched_type == EventTypes.election:
		return Election.load_event_by_id(sched_id)
	raise InvalidScheduleType
	
class OneUpSeries(Object):
	def __init__(self):
		pass
		
	def add_song(self, song):
		pass

class Event(Object):
	def __init__(self):
		self.id = None
		
	def update(self):
	
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
	
	def get_filename(self):
		pass
	
	def is_in_progress(self):
		pass
	
	def finish(self):
		pass
		
	def length(self):
		pass
		
	def start(self):
		pass
		
	def is_in_progress(self):
		pass

# AKA the normal election
class Election(Event):
	@classmethod
	def load_by_id(cls):
		pass
		
	@classmethod
	def load_by_type(cls, sid, type):
		sched_id = db.c.fetch_var("SELECT * FROM r4_elections JOIN r4_schedule USING (sched_id) WHERE elec_type = %s AND elec_used = FALSE AND sid = %s ORDER BY elec_id DESC", (type, sid))
		if not sched_id:
			raise InvalidScheduleID("No election of type %s exists" % sched_id)
		return cls.load_by_id(type)
	
	@classmethod
	def create(cls, sid, type = ElectionTypes.normal):
		elec_id = db.c.get_next_id("r4_elections", "elec_id")
		elec = cls()
		elec.id = elec_id
		elec.type = type
		elec.used = False
		elec.played_at = None
		elec.sid = sid
		elec.songs = []
		db.c.update("INSERT INTO r4_elections (elec_id, elec_used, elec_type, sid) VALUES (%s, %s, %s, %s)", (elec.elec_id, False, elec.elec_type, elec.sid))
		return elec
	
	def fill(self, target_song_length = None):
		self._add_from_queue()
		self._add_requests()
		for i in range(length(self.songs), config.get_station(self.sid, "songs_in_election")):
			song = playlist.get_random_song(self.sid, target_song_length)
			song.data['elec_votes'] = 0
			song.data['entry_type'] = constants.ElecSongTypes.normal
			song.data['elec_request_user_id'] = 0
			song.data['elec_request_username'] = None
			self._check_song_for_conflict(song)
			self.add_song(song)
			
	def _check_song_for_conflict(self, song):
		for album in song.albums:
			conflicting_user = db.c.fetch_var("SELECT username "
				"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN r4_song_album ON (line_top_song_id = r4_song_album.song_id) JOIN phpbb_users ON (r4_listeners.user_id = phpbb_users.user_id) "
				"WHERE r4_listeners.sid = %s AND r4_request_line.sid = %s AND r4_song_album.sid = %s AND r4_song_album.album_id = %s "
				"ORDER BY line_wait_start LIMIT 1",
				(self.sid, self.sid, self.sid, album.id))
			if conflicting_user:
				song.data['entry_type'] = constants.ElecSongTypes.conflict
				song.data['request_username'] = conflicting_user
		requesting_user = db.c.fetch_var("SELECT username "
			"FROM r4_listeners JOIN r4_request_line USING (user_id) JOIN phpbb_users USING (user_id) "
			"WHERE r4_listeners.sid = %s AND r4_request_line.sid = %s AND song_id = %s "
			"ORDER BY line_wait_start LIMIT 1",
			(self.sid, self.sid, song.id))
		if num_requests > 0:
			song.data['entry_type'] = constants.ElecSongTypes.request
			song.data['request_username'] = requesting_user
		
	def add_song(self, song):
		db.c.update("INSERT INTO r4_election_entries (song_id, elec_id, entry_position, entry_type) VALUES (%s, %s, %s)", (song.id, self.id, length(self.songs), song.data['entry_type']))
		song.start_block(self.sid, constants.ElecBlockTypes.in_elec, config.get_station(sid, "elec_block_length"))
		self.songs.append(song)
	
	def get_filename(self):
		if not self.used:
			results = db.c.fetch_all("SELECT song_id, elec_votes FROM r4_election_entries WHERE elec_id = %s", (self.id,))
			for song in self.songs:
				for song_result in results:
					if song_result['song_id'] == song.id:
						song.data['elec_votes'] == song_result['elec_votes']
					# Auto-votes for somebody's request
					if song.data['elec_is_request'] == constants.ElecSongTypes.request:
						if db.c.fetch_var("SELECT COUNT(*) FROM r4_vote_history WHERE user_id = %s AND elec_id = %s", (song.data['elec_request_user_id'], self.id)) == 0:
							song.data['elec_votes'] += 1
			random.shuffle(self.songs)
			self.songs = sorted(self.songs, key=lambda song: song.data['entry_type'])
			self.songs = sorted(self.songs, key=lambda song: song.data['elec_votes'])
			self.songs.reverse()
		return self.songs[0]
		
	def _add_from_queue(self):
		for row in db.c.fetch_all("SELECT elecq_id, song_id FROM r4_election_queue WHERE sid = %s ORDER BY elecq_id LIMIT %s" % (self.sid, config.get_station(self.sid, "songs_in_election"))):
			db.c.update("DELETE FROM r4_election_queue WHERE elecq_id = %s" % (row['elecq_id'],))
			song = playlist.Song.load_from_id(row['song_id'], self.sid)
			self.add_song(song)
			
	def _add_requests(self):
		global _request_interval
		global _request_sequence
		if self.is_request_needed() and length(self.songs) < config.get_station(self.sid, "songs_in_election"):
			self.add_song(self.get_request())
		
	def is_request_needed(self):
		global _request_interval
		global _request_sequence
		if not self.sid in _request_interval:
			_request_interval[self.sid] = cache.get_station_var(self.sid, "request_interval")
			if not _request_interval[self.sid]:
				_request_interval[self.sid] = 0
		if not self.sid in _request_sequence:
			_request_sequence[self.sid] = cache.get_station_var(self.sid, "request_sequence")
			if not _request_sequence[self.sid]:
				_request_sequence[self.sid] = 0
				
		# If we're ready for a request sequence, start one
		if _request_interval[self.sid] <= 0 and _request_sequence[self.sid] <= 0:
			line_length = db.c.fetch_var("SELECT COUNT(*) FROM r4_request_line WHERE sid = %s", (self.sid,))
			_request_sequence[self.sid] = 1 + math.floor(line_length / config.get_station(self.sid, "request_interval_scale"))
			_request_interval[self.sid] = config.get_station(self.sid, "request_interval_gap")
			return True
		# If we are in a request sequence, do one
		elif _request_sequence[self.sid] > 0:
			return True
		else:
			_request_interval[self.sid] -= 1
			return False
		
	def get_request(self):
		pass
		
	def length(self):
		pass
		
	def finish(self):
		pass
		
class OneUp(Event):
	@classmethod
	def load_event_by_id(cls, id):
		pass

class Jingle(Event):
	@classmethod
	def load_event_by_id(cls, id):
		pass
		
class LiveShow(Event):
	@classmethod
	def load_event_by_id(cls, id):
		pass