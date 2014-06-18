import random
import time

from libs import db
from rainwave import playlist
from rainwave.events import event

@event.register_producer
class OneUpProducer(event.BaseProducer):
	# AKA Power Hour

	def __init__(self, sid):
		super(OneUpProducer, self).__init__(sid)
		self.plan_ahead_limit = 3

	def load_next_event(self, target_length = None, min_elec_id = None):
		next_up_id = db.c.fetch_var("SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = FALSE ORDER BY one_up_order LIMIT 1", (self.id,))
		if next_up_id:
			db.c.update("UPDATE r4_one_ups SET one_up_queued = TRUE WHERE one_up_id = %s", (next_up_id,))
			up = OneUp.load_by_id(next_up_id, self.sid)
			up.name = self.name
			up.url = up.url
			return up
		else:
			db.c.update("UPDATE r4_schedule SET sched_used = TRUE WHERE sched_id = %s", (self.id,))
			return None
		if not self.start_actual:
			self.start_actual = time.time()
			self._update_length()

	def change_start(self, new_start):
		if not self.used:
			length = self.end - self.start
			self.start = new_start
			self.end = self.start + length
			db.c.update("UPDATE r4_schedule SET sched_start = %s, sched_end = %s WHERE sched_id = %s", (self.start, self.end, self.id))
		else:
			raise Exception("Cannot change the start time of a used producer.")

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
		next_song_id = db.c.fetch_var("SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = TRUE ORDER BY one_up_order DESC LIMIT 1", (self.id,))
		if next_song_id:
			up = OneUp.load_by_id(self.id, self.sid)
			up.name = self.name
			up.url = self.url
			return up
		else:
			return None

	def add_song_id(self, song_id, sid, order = None):
		if not order:
			order = db.c.fetch_var("SELECT MAX(one_up_order) + 1 FROM r4_one_ups WHERE sched_id = %s", (self.id,))
			if not order:
				order = 0
		db.c.update("INSERT INTO r4_one_ups (sched_id, song_id, one_up_order, one_up_sid) VALUES (%s, %s, %s, %s)", (self.id, song_id, order, sid))
		self._update_length()

	def add_album_id(self, album_id, sid, order = None):
		order = db.c.fetch_var("SELECT MAX(one_up_order) + 1 FROM r4_one_ups WHERE sched_id = %s", (self.id,))
		if not order:
			order = 0
		for song in playlist.Album.load_from_id_with_songs(album_id, sid).data['songs']:
			self.add_song_id(song['id'], sid, order)
			order += 1
		self._update_length()

	def remove_one_up(self, one_up_id):
		if db.c.update("DELETE FROM r4_one_ups WHERE one_up_id = %s", (one_up_id,)) >= 1:
			self._update_length()
			return True
		return False

	def shuffle_songs(self):
		one_up_ids = db.c.fetch_list("SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s", (self.id,))
		random.shuffle(one_up_ids)
		i = 0
		for one_up_id in one_up_ids:
			db.c.update("UPDATE r4_one_ups SET one_up_order = %s WHERE one_up_id = %s", (i, one_up_id))
			i += 1
		return True

	def load_all_songs(self):
		self.songs = []
		for song_row in db.c.fetch_all("SELECT * FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order", (self.id,)):
			s = playlist.Song.load_from_id(song_row['song_id'], song_row['one_up_sid'])
			s.data['one_up_used'] = song_row['one_up_used']
			s.data['one_up_queued'] = song_row['one_up_queued']
			s.data['one_up_id'] = song_row['one_up_id']
			self.songs.append(s)

	def to_dict(self):
		self.load_all_songs()
		return super(OneUpProducer, self).to_dict()

class OneUp(event.BaseEvent):
	@classmethod
	def load_by_id(cls, one_up_id, sid):
		row = db.c.fetch_row("SELECT * FROM r4_one_ups WHERE one_up_id = %s", (one_up_id,))
		if not row:
			raise Exception("OneUp schedule ID %s not found." % one_up_id)
		one_up = cls()
		one_up.id = row['one_up_id']
		one_up.used = row['one_up_used']
		one_up.songs = [ playlist.Song.load_from_id(row['song_id'], row['one_up_sid']) ]
		one_up.sid = sid
		return one_up

	def start_event(self):
		super(OneUp, self).start_event()
		# db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE one_up_id = %s", (self.id,))
	
	def finish(self):
		super(OneUp, self).finish()
		db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE one_up_id = %s", (self.id,))
