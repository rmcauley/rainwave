from time import time as timestamp
from typing import TypedDict, cast

from api import rainwave_typeddicts
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.schedule_entry_types import ScheduleEntryRow
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


class PowerHourSongCreateRow(TypedDict):
    sched_id: int
    song_id: int
    one_up_order: int | None
    one_up_sid: int


class PowerHourSongRow(PowerHourSongCreateRow):
    one_up_id: int
    one_up_used: bool
    one_up_queued: bool
    one_up_start_actual: int


class PowerHourSong(TimelineEntryBase):
    def __init__(
        self,
        schedule_entry_row: ScheduleEntryRow,
        data: PowerHourSongRow,
        song_on_station: SongOnStation,
    ) -> None:
        super().__init__(
            schedule_entry_row["sid"],
            schedule_entry_row["sched_name"],
            schedule_entry_row["sched_url"],
        )
        self.id = data["one_up_id"]
        self.sid = data["one_up_sid"]
        self.data = data
        self.song_on_station = song_on_station

    @staticmethod
    async def load_by_id(
        cursor: RainwaveCursor, schedule_entry_row: ScheduleEntryRow, id: int
    ) -> PowerHourSong:
        row = await cursor.fetch_row(
            "SELECT * FROM r4_one_ups WHERE one_up_id = %s",
            (id,),
            row_type=PowerHourSongRow,
        )
        if not row:
            raise Exception("PowerHourSong ID %s not found." % id)
        song_on_station = await SongOnStation.load(
            cursor, row["song_id"], row["one_up_sid"]
        )
        return PowerHourSong(schedule_entry_row, row, song_on_station)

    async def start(self, cursor: RainwaveCursor) -> None:
        start_actual = int(timestamp())
        await cursor.update(
            "UPDATE r4_one_ups SET one_up_start_actual = %s WHERE one_up_id = %s",
            (start_actual, self.id),
        )
        self.data["one_up_start_actual"] = start_actual
        await self.song_on_station.start_election_block(cursor)

    async def finish(self, cursor: RainwaveCursor) -> None:
        await cursor.update(
            "UPDATE r4_one_ups SET one_up_used = TRUE WHERE one_up_id = %s", (self.id,)
        )

    def get_song_on_station_to_play(self) -> SongOnStation:
        return self.song_on_station

    def length(self) -> int:
        return self.song_on_station.data["song_length"]

    async def to_api(self, cursor: RainwaveCursor) -> rainwave_typeddicts.TimelineEntry:
        result: rainwave_typeddicts.TimelineEntry = {
            "end": (self.data["one_up_start_actual"] or int(timestamp()))
            + self.length(),
            "id": self.id,
            "length": self.length(),
            "name": self.sched_name,
            "sid": cast(rainwave_typeddicts.StationId, self.sched_sid),
            "songs": [
                await self.get_song_on_station_to_play().to_api_timeline_song(cursor)
            ],
            "start": self.data["one_up_start_actual"],
            "start_actual": self.data["one_up_start_actual"],
            "type": 2,
            "url": self.sched_url,
            "used": self.data["one_up_used"],
            "voting_allowed": False,
        }
        return result
