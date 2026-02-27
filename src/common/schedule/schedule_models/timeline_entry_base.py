from abc import abstractmethod

from api import rainwave_typeddicts
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation


class TimelineEntryAlreadyUsed(Exception):
    pass


class TimelineEntryBase:
    sched_sid: int
    sched_url: str | None
    sched_name: str | None

    def __init__(
        self,
        sched_sid: int,
        sched_name: str | None,
        sched_url: str | None,
    ):
        super().__init__()
        self.sched_sid = sched_sid
        self.sched_url = sched_url
        self.sched_name = sched_name

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

    @abstractmethod
    async def to_api(self, cursor: RainwaveCursor) -> rainwave_typeddicts.TimelineEntry:
        raise NotImplementedError()
