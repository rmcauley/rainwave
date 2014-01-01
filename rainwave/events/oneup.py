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
class OneUpProducer(event.baseProducer):
	def load_next_event(self, target_length = None, min_elec_id = None):
		next_song_id = db.c.fetch_var("SELECT song_id FROM r4_one_ups WHERE sched_id = %s AND one_up_used = FALSE ORDER BY one_up_order LIMIT 1", (self.id,))
		if next_song_id:
			db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE sched_id = %s and song_id = %s", (self.id, next_song_id))
			return OneUp.load_by_id(self.id, next_song_id)
		else:
			return None

	def load_in_progress_event(self):
		next_song_id = db.c.fetch_var("SELECT song_id FROM r4_one_ups WHERE sched_id = %s AND one_up_used = TRUE ORDER BY one_up_order DESC LIMIT 1", (self.id,))
		if next_song_id:
			return 

	def add_song_id(self, song_id, order = None):
		if not order:
			order = db.c.fetch_var("SELECT MAX(one_up_order) FROM r4_one_ups WHERE sched_id = %s GROUP BY sched_id", (self.id,))
			if not order:
				order = 0
		db.c.update("INSERT INTO r4_one_ups (sched_id, song_id, one_up_order) VALUES (%s, %s, %s)", (self.id, song_id, order))

class OneUp(event.BaseEvent):
	@classmethod
	def load_by_id(cls, sched_id, song_id):
		row = db.c.fetch_row("SELECT * FROM r4_one_ups WHERE sched_id = %s AND song_id = %s", (sched_id,song_id))
		if not row:
			raise Exception("OneUp schedule ID %s song ID %s not found." % (sched_id, song_id))
		one_up = cls()
		one_up.id = sched_id
		one_up.songs = [ playlist.Song.load_from_id(row['song_id']) ]
		return one_up

	def start(self):
		super(OneUp, self).start()
		db.c.update("UPDATE r4_one_ups SET one_up_used = TRUE WHERE sched_id = %s AND song_id = %s", (self.id, self.songs[0].id))
