from time import time as timestamp

from common.db.cursor import RainwaveCursor
from common.schedule.get_schedule_entry_from_row import get_schedule_entry_from_row
from common.schedule.schedule_entry_types import ScheduleEntryRow
from common.schedule.schedule_models.schedule_entry_base import ScheduleEntry


async def get_current_schedule_entry(
    cursor: RainwaveCursor, sid: int
) -> ScheduleEntry | None:
    return await get_schedule_entry_at_time(cursor, sid, int(timestamp()))


async def get_schedule_entry_at_time(
    cursor: RainwaveCursor, sid: int, at_time: int
) -> ScheduleEntry | None:
    schedule_row = await cursor.fetch_row(
        """
        SELECT *
        FROM r4_schedule
        WHERE sid = %s
            AND sched_start <= %s
            AND sched_end > %s
        ORDER BY sched_id DESC
        LIMIT 1
        """,
        (sid, at_time + 20, at_time),
        row_type=ScheduleEntryRow,
    )
    if schedule_row:
        return get_schedule_entry_from_row(schedule_row)
    return None
