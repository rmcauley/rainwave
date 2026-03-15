from typing import TypedDict, cast

from api import rainwave_typeddicts
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


class SongHistoryRow(TypedDict):
    songhist_id: int
    songhist_time: int
    sid: int
    song_id: int


fake_id_incrementer = 0


class TimelineSingleSongFromHistory(TimelineEntryBase):
    fake_id: int
    song_on_station: SongOnStation
    song_history_row: SongHistoryRow

    def __init__(
        self, sid: int, song_on_station: SongOnStation, song_history_row: SongHistoryRow
    ) -> None:
        super().__init__(sid, sched_name=None, sched_url=None)
        self.song_on_station = song_on_station
        self.song_history_row = song_history_row

        global fake_id_incrementer
        self.fake_id = fake_id_incrementer
        fake_id_incrementer += 1

    @staticmethod
    async def load_last_5(cursor: RainwaveCursor, sid: int) -> list[TimelineEntryBase]:
        result: list[TimelineSingleSongFromHistory] = []
        rows = await cursor.fetch_all(
            "SELECT * FROM r4_song_history WHERE sid = %s ORDER BY songhist_id DESC LIMIT 5",
            (sid,),
            row_type=SongHistoryRow,
        )
        for row in rows:
            result.append(
                TimelineSingleSongFromHistory(
                    sid, await SongOnStation.load(cursor, row["song_id"], sid), row
                )
            )

        return cast(list[TimelineEntryBase], result)

    async def start(self, cursor: RainwaveCursor) -> None:
        pass

    async def finish(self, cursor: RainwaveCursor) -> None:
        pass

    def get_song_on_station_to_play(self) -> SongOnStation:
        return self.song_on_station

    def length(self) -> int:
        return self.song_on_station.data["song_length"]

    async def to_api(self, cursor: RainwaveCursor) -> rainwave_typeddicts.TimelineEntry:
        result: rainwave_typeddicts.TimelineEntry = {
            "end": self.song_history_row["songhist_time"],
            "id": self.fake_id,
            "length": self.length(),
            "name": self.sched_name,
            "sid": self.sched_sid,
            "songs": [
                await self.get_song_on_station_to_play().to_api_timeline_song(cursor)
            ],
            "start": self.song_history_row["songhist_time"] - self.length(),
            "start_actual": self.song_history_row["songhist_time"] - self.length(),
            "type": "OneUp",
            "url": self.sched_url,
            "used": True,
            "voting_allowed": False,
        }
        return result
