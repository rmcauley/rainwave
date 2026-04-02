from time import time as timestamp

from common.db.cursor import RainwaveCursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.schedule_entry_types import ScheduleEntryRow


async def duplicate_schedule_entry(
    cursor: RainwaveCursor,
    entry: ScheduleEntryRow,
    creator_user_id: int,
) -> ScheduleEntryRow:
    current_time = int(timestamp())
    sched_start = entry["sched_start"]
    sched_end = entry["sched_end"]
    if not sched_start or sched_start < current_time:
        sched_start = current_time + 86400
        sched_end = None

    return await create_schedule_entry(
        cursor,
        {
            "sched_creator_user_id": creator_user_id,
            "sched_end": sched_end,
            "sched_name": entry["sched_name"],
            "sched_start": sched_start,
            "sched_timed": entry["sched_timed"],
            "sched_type": entry["sched_type"],
            "sched_url": entry["sched_url"],
            "sid": entry["sid"],
            "sched_is_auto_ph": False,
        },
    )
