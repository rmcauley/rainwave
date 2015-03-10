from rainwave.events.event import BaseEvent
from rainwave import playlist

class SingleSong(BaseEvent):
	incrementer = 0

	def __init__(self, song_id, sid):
		super(SingleSong, self).__init__(sid)
		self.songs = [ playlist.Song.load_from_id(song_id, sid) ]
		self.id = SingleSong.incrementer
		SingleSong.incrementer += 1