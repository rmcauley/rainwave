from typing import TypedDict

from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation
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


class PowerHourSong(TimelineEntryBase):
    def __init__(self, data: PowerHourSongRow, song_on_station: SongOnStation) -> None:
        self.id = data["one_up_id"]
        self.sid = data["one_up_sid"]
        self.data = data
        self.song_on_station = song_on_station

    @staticmethod
    async def load_by_id(cursor: RainwaveCursor, id: int, sid: int) -> PowerHourSong:
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
        return PowerHourSong(row, song_on_station)

    async def start(self, cursor: RainwaveCursor) -> None:
        await self.song_on_station.start_election_block(cursor)

    async def finish(self, cursor: RainwaveCursor) -> None:
        await cursor.update(
            "UPDATE r4_one_ups SET one_up_used = TRUE WHERE one_up_id = %s", (self.id,)
        )

    def get_song_on_station_to_play(self) -> SongOnStation:
        return self.song_on_station

    def length(self) -> int:
        return self.song_on_station.data["song_length"]
