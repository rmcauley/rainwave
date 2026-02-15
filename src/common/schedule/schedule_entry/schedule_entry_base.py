from abc import abstractmethod
from time import time as timestamp
from typing import Any

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.schedule.schedule_entry_types import ScheduleEntryRow, ScheduleEntryType


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

    async def update_start(
        self, cursor: RainwaveCursor | RainwaveCursorTx, new_start: int
    ) -> None:
        if not self.data["sched_used"]:
            self.data["sched_start"] = new_start
            await cursor.update(
                "UPDATE r4_schedule SET sched_start = %s WHERE sched_id = %s",
                (self.data["sched_start"], self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    async def update_end(
        self, cursor: RainwaveCursor | RainwaveCursorTx, new_end: int
    ) -> None:
        if not self.data["sched_used"]:
            self.data["sched_end"] = new_end
            await cursor.update(
                "UPDATE r4_schedule SET sched_end = %s WHERE sched_id = %s",
                (self.data["sched_end"], self.id),
            )
        else:
            raise Exception("Cannot change the start time of a used producer.")

    async def update_as_started(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        if not self.data["sched_start_actual"]:
            self.data["sched_start_actual"] = int(timestamp())
            await cursor.update(
                "UPDATE r4_schedule SET sched_in_progress = TRUE, sched_start_actual = %s where sched_id = %s",
                (self.data["sched_start_actual"], self.id),
            )

    async def update_as_finished(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        self.data["sched_end_actual"] = int(timestamp())
        await cursor.update(
            "UPDATE r4_schedule SET sched_used = TRUE, sched_in_progress = FALSE, sched_end_actual = %s WHERE sched_id = %s",
            (self.data["sched_end_actual"], self.id),
        )

    @abstractmethod
    def has_next_event(self) -> bool:
        raise NotImplementedError()

    @abstractmethod
    def load_next_event(
        self, target_length: int | None = None, min_elec_id: int | None = None
    ) -> Any:
        raise NotImplementedError()

    @abstractmethod
    def load_event_in_progress(self) -> Any:
        raise NotImplementedError()
