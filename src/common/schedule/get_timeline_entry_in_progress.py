from common.db.cursor import RainwaveCursor
from common.schedule.get_schedule_at_time import get_current_schedule_entry
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


async def get_timeline_entry_in_progress(
    cursor: RainwaveCursor, sid: int
) -> TimelineEntryBase | None:
    schedule_entry = await get_current_schedule_entry(cursor, sid)
    if schedule_entry:
        timeline_entry = await schedule_entry.get_timeline_entry_in_progress(cursor)
        if not timeline_entry and await schedule_entry.has_timeline_entries_remaining(
            cursor
        ):
            timeline_entry = await schedule_entry.get_next_timeline_entry(
                cursor, [], None
            )
            return timeline_entry
    return None
