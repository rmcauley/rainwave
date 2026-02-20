import random
from typing import Sequence, TypedDict

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.album.get_song_list_for_album_display import (
    get_songs_for_album_display,
)
from common.playlist.song.model.song_on_station import SongOnStation
from common.requests.request_line_types import RequestLineEntry
from common.schedule.power_hours.power_hour_song import PowerHourSong, PowerHourSongRow
from common.schedule.schedule_models.schedule_entry_base import ScheduleEntry


class PowerHourSongLengthRow(TypedDict):
    sum_song_length: int
    count_song: int


class FillUnratedRow(TypedDict):
    song_id: int
    song_length: int


class PowerHour(ScheduleEntry):
    async def has_timeline_entries_remaining(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> bool:
        next_up_id = await cursor.fetch_var(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = FALSE AND one_up_used = FALSE ORDER BY one_up_order LIMIT 1",
            (self.id,),
            var_type=int,
        )
        return bool(next_up_id)

    async def get_queued_timeline_entries(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> Sequence[PowerHourSong]:
        power_hour_song_ids = await cursor.fetch_list(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = TRUE AND one_up_used = FALSE ORDER BY one_up_order",
            (self.sid,),
            row_type=int,
        )
        return [
            await PowerHourSong.load_by_id(cursor, ph_song_id, self.sid)
            for ph_song_id in power_hour_song_ids
        ]

    async def get_next_timeline_entry(
        self,
        cursor: RainwaveCursor | RainwaveCursorTx,
        request_line: list[RequestLineEntry],
        target_song_length: int | None = None,
    ) -> PowerHourSong | None:
        next_up_id = await cursor.fetch_var(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = FALSE AND one_up_used = FALSE ORDER BY one_up_order LIMIT 1",
            (self.id,),
            var_type=int,
        )
        if next_up_id:
            await cursor.update(
                "UPDATE r4_one_ups SET one_up_queued = TRUE WHERE one_up_id = %s",
                (next_up_id,),
            )
            next_up = await PowerHourSong.load_by_id(cursor, next_up_id, self.sid)
            return next_up
        else:
            await cursor.update(
                "UPDATE r4_schedule SET sched_used = TRUE WHERE sched_id = %s",
                (self.id,),
            )
            return None

    async def change_start(
        self, cursor: RainwaveCursor | RainwaveCursorTx, new_start: int
    ) -> None:
        if not self.data["sched_used"]:
            self.data["sched_start"] = new_start
            if self.data["sched_end"] and self.data["sched_start"]:
                length = min(0, self.data["sched_end"] - self.data["sched_start"])
                self.end = self.data["sched_start"] + length
            await cursor.update(
                "UPDATE r4_schedule SET sched_start = %s, sched_end = %s WHERE sched_id = %s",
                (self.data["sched_start"], self.data["sched_end"], self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    async def _update_length(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        stats = await cursor.fetch_row(
            """
            SELECT 
                SUM(song_length) AS sum_song_length, 
                COUNT(song_length) AS count_song
            FROM r4_one_ups 
                JOIN r4_songs USING (song_id) 
            WHERE sched_id = %s
            GROUP BY sched_id
            """,
            (self.id,),
            row_type=PowerHourSongLengthRow,
        )

        # for some reason we need 'buffer' at the end of each song for switching
        # otherwise the power hour cuts off the last few songs if we just do straight sum(song_length)
        # the time is short an averages 15 seconds per song in my testing
        # how this discrepency happens I don't know, but we add 30s of 'buffer' to each song
        length = 0
        if stats:
            length = stats["sum_song_length"] + (30 * stats["count_song"])

        if self.data["sched_start_actual"]:
            self.data["sched_end"] = self.data["sched_start_actual"] + length
        elif self.data["sched_start"]:
            self.data["sched_end"] = self.data["sched_start"] + length
        await cursor.update(
            "UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s",
            (self.data["sched_end"], self.id),
        )

    async def get_timeline_entry_in_progress(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> PowerHourSong | None:
        next_song_id = await cursor.fetch_var(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s AND one_up_queued = TRUE ORDER BY one_up_order ASC LIMIT 1",
            (self.id,),
            var_type=int,
        )
        if next_song_id:
            return await PowerHourSong.load_by_id(cursor, next_song_id, self.sid)
        return None

    async def add_song_id(
        self,
        cursor: RainwaveCursor | RainwaveCursorTx,
        song_id: int,
        order: int | None = None,
    ) -> None:
        if not order:
            order = await cursor.fetch_guaranteed(
                "SELECT MAX(one_up_order) + 1 FROM r4_one_ups WHERE sched_id = %s",
                (self.id,),
                default=0,
                var_type=int,
            )
        await cursor.update(
            "INSERT INTO r4_one_ups (sched_id, song_id, one_up_order, one_up_sid) VALUES (%s, %s, %s, %s)",
            (self.id, song_id, order, self.sid),
        )
        await self._update_length(cursor)

    async def add_album_id(
        self,
        cursor: RainwaveCursor | RainwaveCursorTx,
        album_id: int,
        order: int | None = None,
    ) -> None:
        order = await cursor.fetch_guaranteed(
            "SELECT MAX(one_up_order) + 1 FROM r4_one_ups WHERE sched_id = %s",
            (self.id,),
            default=0,
            var_type=int,
        )
        for song in await get_songs_for_album_display(
            cursor, album_id, self.sid, 1, "song_title"
        ):
            await self.add_song_id(cursor, song["id"], order=None)
            order += 1
        await self._update_length(cursor)

    async def remove_one_up(
        self, cursor: RainwaveCursor | RainwaveCursorTx, power_hour_song_id: int
    ) -> bool:
        if (
            await cursor.update(
                "DELETE FROM r4_one_ups WHERE one_up_id = %s", (power_hour_song_id,)
            )
            >= 1
        ):
            await self._update_length(cursor)
            return True
        return False

    async def shuffle_songs(self, cursor: RainwaveCursor | RainwaveCursorTx) -> bool:
        power_hour_song_ids = await cursor.fetch_list(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s",
            (self.id,),
            row_type=int,
        )
        random.shuffle(power_hour_song_ids)
        i = 0
        for power_hour_song_id in power_hour_song_ids:
            await cursor.update(
                "UPDATE r4_one_ups SET one_up_order = %s WHERE one_up_id = %s",
                (i, power_hour_song_id),
            )
            i += 1
        return True

    async def move_song_up(
        self, cursor: RainwaveCursor | RainwaveCursorTx, one_up_id: int
    ) -> bool:
        power_hour_song_ids = await cursor.fetch_list(
            "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order",
            (self.id,),
            row_type=int,
        )
        i = 0
        prev_one_up_id: int | None = None
        for power_hour_song_id in power_hour_song_ids:
            if power_hour_song_id == one_up_id and prev_one_up_id:
                await cursor.update(
                    "UPDATE r4_one_ups SET one_up_order = %s WHERE one_up_id = %s",
                    (i - 1, one_up_id),
                )
                await cursor.update(
                    "UPDATE r4_one_ups SET one_up_order = %s WHERE one_up_id = %s",
                    (i, prev_one_up_id),
                )
            prev_one_up_id = power_hour_song_id
            i += 1
        return True

    async def load_all_songs(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> list[PowerHourSong]:
        songs: list[PowerHourSong] = []
        for power_hour_song_row in await cursor.fetch_all(
            "SELECT * FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order",
            (self.id,),
            row_type=PowerHourSongRow,
        ):
            song_on_station = await SongOnStation.load(
                cursor, power_hour_song_row["song_id"], self.sid
            )
            songs.append(PowerHourSong(power_hour_song_row, song_on_station))
        return songs

    async def fill_unrated(
        self, cursor: RainwaveCursor | RainwaveCursorTx, max_length: int
    ) -> None:
        total_time = 0
        rows = await cursor.fetch_all(
            """
            SELECT
                song_id,
                song_length
            FROM r4_song_sid
            JOIN r4_songs USING (song_id)
            WHERE sid = %s
                AND song_rating = 0
                AND song_exists = TRUE
                AND song_verified = TRUE
            ORDER BY song_rating_count,
                song_added_on,
                random()
            LIMIT 100
            """,
            (self.sid,),
            row_type=FillUnratedRow,
        )
        for row in rows:
            if total_time > max_length:
                return
            await self.add_song_id(cursor, row["song_id"], order=None)
            total_time += row["song_length"]
        await self._update_length(cursor)
