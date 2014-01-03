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
from rainwave.events import event

@event.register_producer
class OneUpProducer(event.BaseProducer):
	def load_next_event(self, target_length = None, min_elec_id = None):
		next_song_id = db.c.fetch_var("SELECT song_id FROM r4_one_ups WHERE sched_id = %s AND one_up_used = FALSE ORDER BY one_up_order LIMIT 1", (self.id,))
		if next_song_id:
			db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE sched_id = %s and song_id = %s", (self.id, next_song_id))
			return OneUp.load_by_id(self.id, next_song_id, self.sid)
		else:
			return None
		if not self.start_actual:
			self.start_actual = time.time()
			self._update_length()

	def _update_length(self):
		length = db.c.fetch_var("SELECT SUM(song_length) FROM r4_one_ups JOIN r4_songs USING (song_id) WHERE sched_id = %s GROUP BY sched_id", (self.id,))
		if not length:
			length = 0
		if self.start_actual:
			self.end = self.start_actual + length
		else:
			self.end = self.start + length
		db.c.update("UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s", (self.end, self.id))

	def load_event_in_progress(self):
		next_song_id = db.c.fetch_var("SELECT song_id FROM r4_one_ups WHERE sched_id = %s AND one_up_used = TRUE ORDER BY one_up_order DESC LIMIT 1", (self.id,))
		if next_song_id:
			return OneUp.load_by_id(self.id, next_song_id, self.sid)
		else:
			return None

	def add_song_id(self, song_id, order = None):
		if not order:
			order = db.c.fetch_var("SELECT MAX(one_up_order) FROM r4_one_ups WHERE sched_id = %s GROUP BY sched_id", (self.id,))
			if not order:
				order = 0
		db.c.update("INSERT INTO r4_one_ups (sched_id, song_id, one_up_order) VALUES (%s, %s, %s)", (self.id, song_id, order))
		self._update_length()

	def remove_song_id(self, song_id):
		if db.c.update("DELETE FROM r4_one_ups WHERE song_id = %s AND sched_id = %s", (song_id, self.id)) >= 1:
			self._update_length()
			return True
		return False

	def shuffle_songs(self):
		song_ids = db.c.fetch_list("SELECT song_id FROM r4_one_ups WHERE sched_id = %s", (self.id,))
		random.shuffle(song_ids)
		i = 0
		for song_id in song_ids:
			db.c.update("UPDATE r4_one_ups SET one_up_order = %s WHERE sched_id = %s AND song_id = %s", (i, self.id, song_id))
		return True

	def load_all_songs(self):
		self.songs = []
		for song_id in db.c.fetch_list("SELECT song_id FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order", (self.id,)):
			self.songs.append(playlist.Song.load_from_id(song_id, self.sid))

	def to_dict(self):
		self.load_all_songs()
		return super(OneUpProducer, self).to_dict()

class OneUp(event.BaseEvent):
	@classmethod
	def load_by_id(cls, sched_id, song_id, sid):
		row = db.c.fetch_row("SELECT * FROM r4_one_ups WHERE sched_id = %s AND song_id = %s", (sched_id,song_id))
		if not row:
			raise Exception("OneUp schedule ID %s song ID %s not found." % (sched_id, song_id))
		one_up = cls()
		one_up.id = sched_id
		one_up.songs = [ playlist.Song.load_from_id(row['song_id'], sid) ]
		one_up.sid = sid;
		return one_up

	def start(self):
		super(OneUp, self).start()
		db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE sched_id = %s AND song_id = %s", (self.id, self.songs[0].id))
		self.used = True
	
	def finish(self):
		if not self.used:
			db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE sched_id = %s AND song_id = %s", (self.id, self.songs[0].id))
			self.used = True
		super(OneUp, self).finish()
