from abc import abstractmethod

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.song.model.song_on_station import SongOnStation


class TimelineEntryAlreadyUsed(Exception):
    pass


class TimelineEntryBase:
    id: int
    start_actual: int | None

    @abstractmethod
    async def start(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        raise NotImplementedError()

    @abstractmethod
    async def finish(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        raise NotImplementedError()

    @abstractmethod
    def get_song_on_station_to_play(self) -> SongOnStation:
        raise NotImplementedError()

    @abstractmethod
    def length(self) -> int:
        raise NotImplementedError()
