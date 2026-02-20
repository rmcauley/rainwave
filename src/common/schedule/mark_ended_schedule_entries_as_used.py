from time import time as timestamp
from common.db.cursor import RainwaveCursor
from common.schedule.get_schedule_entry_from_row import get_schedule_entry_from_row
from common.schedule.schedule_entry_types import ScheduleEntryRow


async def mark_ended_schedule_entries_as_used(cursor: RainwaveCursor, sid: int) -> None:
    for schedule_entry_row in await cursor.fetch_list(
        "SELECT * FROM r4_schedule WHERE sched_end < %s AND sid = %s AND sched_used = FALSE",
        (int(timestamp()), sid),
        row_type=ScheduleEntryRow,
    ):
        schedule_entry = get_schedule_entry_from_row(schedule_entry_row)
        await schedule_entry.update_as_finished(cursor)
