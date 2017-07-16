from rainwave.events.event import BaseEvent
from rainwave import playlist

class SingleSong(BaseEvent):
	incrementer = 0

	def __init__(self, song, sid):
		super(SingleSong, self).__init__(sid)
		if isinstance(song, (int, long)):
			self.songs = [ playlist.Song.load_from_id(song, sid) ]
		elif isinstance(song, playlist.Song):
			self.songs = [ song ]
		else:
			raise Exception("Not a song.")
		self.id = SingleSong.incrementer
		SingleSong.incrementer += 1