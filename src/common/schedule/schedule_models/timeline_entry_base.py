from abc import abstractmethod

from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation


class TimelineEntryAlreadyUsed(Exception):
    pass


class TimelineEntryBase:
    id: int
    start_actual: int | None

    def __init__(self, id: int, start_actual: int | None):
        super().__init__()
        self.id = id
        self.start_actual = start_actual

    @abstractmethod
    async def start(self, cursor: RainwaveCursor) -> None:
        raise NotImplementedError()

    @abstractmethod
    async def finish(self, cursor: RainwaveCursor) -> None:
        raise NotImplementedError()

    @abstractmethod
    def get_song_on_station_to_play(self) -> SongOnStation:
        raise NotImplementedError()

    @abstractmethod
    def length(self) -> int:
        raise NotImplementedError()
