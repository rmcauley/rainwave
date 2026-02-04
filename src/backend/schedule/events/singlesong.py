from src.backend.rainwave.events.event import BaseEvent
from src.backend.rainwave import playlist


class SingleSong(BaseEvent):
    incrementer = 0

    def __init__(self, song: int | playlist.Song, sid: int) -> None:
        super().__init__(sid)
        if isinstance(song, int):
            self.songs = [playlist.Song.load_from_id(song, sid)]
        elif isinstance(song, playlist.Song):
            self.songs = [song]
        else:
            raise Exception("Not a song.")
        self.id = SingleSong.incrementer
        SingleSong.incrementer += 1
