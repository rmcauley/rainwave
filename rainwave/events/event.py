import time

from libs import db
from libs import log
from rainwave import playlist

all_producers = {}

def register_producer(cls):
	global all_producers
	all_producers[cls.__name__] = cls
	return cls

def get_admin_creatable_producers():
	types = []
	for key in all_producers.keys():
		if ((key != "ShortestElectionProducer") and
				(key != "ElectionProducer") and
				(key != "OneUpProducer")):
			types.append(key)
	return types

class InvalidScheduleID(Exception):
	pass

class InvalidScheduleType(Exception):
	pass

class EventAlreadyUsed(Exception):
	pass

class BaseProducer(object):
	@classmethod
	def load_producer_by_id(cls, sched_id):
		global all_producers
		row = db.c.fetch_row("SELECT * FROM r4_schedule WHERE sched_id = %s", (sched_id,))
		if not row or len(row) == 0:
			return None
		p = None
		if row['sched_type'] in all_producers:
			p = all_producers[row['sched_type']](row['sid'])
		else:
			raise Exception("Unknown producer type %s." % row['sched_type'])
		p.id = row['sched_id']
		p.start = row['sched_start']
		p.start_actual = row['sched_start_actual']
		p.end = row['sched_end']
		p.end_actual = row['sched_end_actual']
		p.name = row['sched_name']
		p.public = row['sched_public']
		p.timed = row['sched_timed']
		p.in_progress = row['sched_in_progress']
		p.used = row['sched_used']
		p.use_crossfade = row['sched_use_crossfade']
		p.use_tag_suffix = row['sched_use_tag_suffix']
		p.url = row['sched_url']
		p.load()
		return p

	@classmethod
	def create(cls, sid, start, end, name = None, public = True, timed = True, url = None, use_crossfade = True, use_tag_suffix = True):
		evt = cls(sid)
		evt.id = db.c.get_next_id("r4_schedule", "sched_id")
		evt.start = start
		evt.end = end
		evt.name = name
		evt.sid = sid
		evt.public = public
		evt.timed = timed
		evt.url = url
		evt.use_crossfade = use_crossfade
		evt.use_tag_suffix = use_tag_suffix
		db.c.update("INSERT INTO r4_schedule "
					"(sched_id, sched_start, sched_end, sched_type, sched_name, sid, sched_public, sched_timed, sched_url, sched_use_crossfade, sched_use_tag_suffix) VALUES "
					"(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
					(evt.id, evt.start, evt.end, evt.type, evt.name, evt.sid, evt.public, evt.timed, evt.url, evt.use_crossfade, evt.use_tag_suffix))
		return evt

	def __init__(self, sid):
		self.sid = sid
		self.id = None
		self.start = 0
		self.start_actual = None
		self.end = None
		self.end_actual = None
		self.type = self.__class__.__name__
		self.name = None
		self.public = True
		self.timed = True
		self.url = None
		self.in_progress = False
		self.used = False
		self.use_crossfade = True
		self.use_tag_suffix = True
		self.plan_ahead_limit = 1
		self.songs = None

	def change_start(self, new_start):
		if not self.used:
			self.start = new_start
			db.c.update("UPDATE r4_schedule SET sched_start = %s WHERE sched_id = %s", (self.start, self.id))
		else:
			raise Exception("Cannot change the start time of a used producer.")

	def change_end(self, new_end):
		if not self.used:
			self.end = new_end
			db.c.update("UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s", (self.end, self.id))
		else:
			raise Exception("Cannot change the start time of a used producer.")

	def load_next_event(self, target_length = None, min_elec_id = None):
		raise Exception("No event type specified.")

	def load_event_in_progress(self):
		raise Exception("No event type specified.")

	def start_producer(self):
		self.start_actual = int(time.time())
		if self.id:
			db.c.update("UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s", (self.start_actual, self.id))

	def finish(self):
		self.end_actual = int(time.time())
		if self.id:
			db.c.update("UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s", (self.end_actual, self.id))

	def load(self):
		pass

	def to_dict(self):
		obj = {
			"sid": self.sid,
			"id": self.id,
			"start": self.start,
			"start_actual": self.start_actual,
			"end": self.end,
			"end_actual": self.end_actual,
			"type": self.type,
			"name": self.name,
			"public": self.public,
			"timed": self.timed,
			"url": self.url,
			"in_progress": self.in_progress,
			"used": self.used,
			"use_crossfade": self.use_crossfade,
			"use_tag_suffix": self.use_tag_suffix,
			"plan_ahead_limit": self.plan_ahead_limit
		}
		if hasattr(self, "songs"):
			obj['songs'] = []
			for song in self.songs:
				obj['songs'].append(song.to_dict())
		return obj

class BaseEvent(object):
	def __init__(self, sid = None):
		self.id = None
		self.type = self.__class__.__name__
		self.start = None
		self.start_actual = None
		self.use_crossfade = True
		self.use_tag_suffix = True
		self.end = None
		self.end_actual = None
		self.used = False
		self.url = None
		self.in_progress = False
		self.is_election = False
		self.replay_gain = None
		self.name = None
		self.sid = sid
		self.songs = None

	def _update_from_dict(self, dct):
		pass

	def get_filename(self):
		if hasattr(self, "songs"):
			return self.songs[0].filename
		return None

	def get_song(self):
		if hasattr(self, "songs"):
			return self.songs[0]
		return None

	def prepare_event(self):
		if self.in_progress and not self.used:
			return
		elif self.used:
			raise EventAlreadyUsed
		self.replay_gain = self.get_song().replay_gain

	def start_event(self):
		self.start_actual = int(time.time())
		self.in_progress = True

	def finish(self):
		self.used = True
		self.in_progress = False
		self.end = int(time.time())

		song = self.get_song()
		if song:
			song.update_last_played(self.sid)
			song.start_cooldown(self.sid)

	def length(self):
		# These go in descending order of accuracy
		if not self.used and hasattr(self, "songs"):
			return self.songs[0].data['length']
		elif self.start_actual:
			return self.start_actual - self.end
		elif self.start and self.end:
			return self.start - self.end
		elif hasattr(self, "songs"):
			return self.songs[0].data['length']
		else:
			log.warn("event", "Event ID %s (type %s) failed on length calculation.  Used: %s / Songs: %s / Start Actual: %s / Start: %s / End: %s" % (self.id, self.type, self.used, len(self.songs), self.start_actual, self.start, self.end))
			return 0

	def to_dict(self, user = None, check_rating_acl=False):
		obj = {
			"id": self.id,
			"start": self.start,
			"start_actual": self.start_actual,
			"end": self.end_actual or self.end,
			"type": self.type,
			"name": self.name,
			"sid": self.sid,
			"url": self.url,
			"voting_allowed": False,
			"used": self.used,
			"length": self.length()
		}
		if hasattr(self, "songs"):
			if self.start_actual:
				obj['end'] = self.start_actual + self.length()
			elif self.start:
				obj['end'] = self.start + self.length()
			obj['songs'] = []
			for song in self.songs:
				if check_rating_acl:
					song.check_rating_acl(user)
				obj['songs'].append(song.to_dict(user))
		return obj

class SingleSong(BaseEvent):
	incrementer = 0

	def __init__(self, song_id, sid):
		super(SingleSong, self).__init__(sid)
		self.songs = [ playlist.Song.load_from_id(song_id, sid) ]
		self.id = SingleSong.incrementer
		SingleSong.incrementer += 1