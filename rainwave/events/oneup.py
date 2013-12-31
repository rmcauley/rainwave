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
	pass

class OneUp(event.BaseEvent):
	@classmethod
	def load_by_id(cls, sched_id):
		row = db.c.fetch_row("SELECT * FROM r4_schedule JOIN r4_one_ups USING (sched_id) WHERE r4_schedule.sched_id = %s", (sched_id,))
		if not row:
			raise InvalidScheduleID
		one_up = cls()
		one_up._update_from_dict(row)
		one_up.songs = [ playlist.Song.load_from_id(row['song_id']) ]
		one_up.end = one_up.start + one_up.length()
		return one_up

	@classmethod
	def create(cls, sid, start, song_id):
		song = playlist.Song.load_from_id(song_id)
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