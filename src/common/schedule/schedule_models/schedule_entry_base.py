from abc import abstractmethod
from time import time as timestamp
from typing import Sequence

from common.db.cursor import RainwaveCursor
from common.requests.request_line_types import RequestLineEntry
from common.schedule.schedule_entry_types import ScheduleEntryRow, ScheduleEntryType
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


class ScheduleEntry:
    id: int
    sid: int
    data: ScheduleEntryRow
    type: ScheduleEntryType

    def __init__(self, type: ScheduleEntryType, data: ScheduleEntryRow) -> None:
        self.data = data
        self.type = type
        self.id = data["sched_id"]
        self.sid = data["sid"]

    async def update_start(self, cursor: RainwaveCursor, new_start: int) -> None:
        if not self.data["sched_used"]:
            self.data["sched_start"] = new_start
            await cursor.update(
                "UPDATE r4_schedule SET sched_start = %s WHERE sched_id = %s",
                (self.data["sched_start"], self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    async def update_end(self, cursor: RainwaveCursor, new_end: int) -> None:
        if not self.data["sched_used"]:
            self.data["sched_end"] = new_end
            await cursor.update(
                "UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s",
                (self.data["sched_end"], self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    async def update_as_started(self, cursor: RainwaveCursor) -> None:
        if not self.data["sched_start_actual"]:
            self.data["sched_start_actual"] = int(timestamp())
            await cursor.update(
                "UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s",
                (self.data["sched_start_actual"], self.id),
            )

    async def update_as_finished(self, cursor: RainwaveCursor) -> None:
        self.data["sched_end_actual"] = int(timestamp())
        await cursor.update(
            "UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s",
            (self.data["sched_end_actual"], self.id),
        )

    @abstractmethod
    async def has_timeline_entries_remaining(self, cursor: RainwaveCursor) -> bool:
        raise NotImplementedError()

    @abstractmethod
    async def get_next_timeline_entry(
        self,
        cursor: RainwaveCursor,
        request_line: list[RequestLineEntry],
        target_song_length: int | None = None,
    ) -> TimelineEntryBase | None:
        raise NotImplementedError()

    @abstractmethod
    async def get_timeline_entry_in_progress(
        self, cursor: RainwaveCursor
    ) -> TimelineEntryBase | None:
        raise NotImplementedError()

    @abstractmethod
    async def get_queued_timeline_entries(
        self, cursor: RainwaveCursor
    ) -> Sequence[TimelineEntryBase]:
        raise NotImplementedError
