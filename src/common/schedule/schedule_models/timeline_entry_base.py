from abc import abstractmethod

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.song.model.song_on_station import SongOnStation


class TimelineEntryAlreadyUsed(Exception):
    pass


class TimelineEntryBase:
    @staticmethod
    async def get_next_id(cursor: RainwaveCursor | RainwaveCursorTx) -> int:
        return await cursor.get_nextval("r4_schedule_sched_id")

    @abstractmethod
    async def start(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        raise NotImplementedError()

    @abstractmethod
    async def finish(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        raise NotImplementedError()

    @abstractmethod
    def get_next_song_on_station(self) -> SongOnStation:
        raise NotImplementedError()

    @abstractmethod
    def length(self) -> int:
        raise NotImplementedError()
