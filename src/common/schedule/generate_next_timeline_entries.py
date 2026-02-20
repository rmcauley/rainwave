from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.get_request_line import get_request_line
from common.requests.request_expiry_times import update_request_expire_times
from common.requests.update_request_line import write_updated_request_line_to_db
from common.schedule.election.election import Election
from common.schedule.get_schedule_at_time import get_schedule_entry_at_time
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase
from common.schedule.timeline import TimelineOnStation


async def generate_next_timeline_entries(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, timeline: TimelineOnStation
) -> None:
    while len(timeline.upnext) < 2:
        new_upnext_start_time = timeline.current.length() + sum(
            upnext.length() for upnext in timeline.upnext
        )
        request_line = await get_request_line(cursor, sid)
        next_schedule_entry = await get_schedule_entry_at_time(
            cursor, sid, new_upnext_start_time
        )
        next_scheduled_entry_start = await cursor.fetch_var(
            "SELECT sched_start FROM r4_schedule WHERE sid = %s AND sched_used = FALSE AND sched_start > %s AND sched_timed = TRUE",
            (sid, new_upnext_start_time),
            var_type=int,
        )

        target_song_length: int | None = None
        # If the next scheduled power hour/pvp hour is less than 6 minutes away, try and line up
        # to the scheduled start time while at least keeping a minute length for elections so we don't
        # bog down the song selector.
        if (
            next_scheduled_entry_start is not None
            and next_scheduled_entry_start - new_upnext_start_time < 300
        ):
            target_song_length = min(
                60, next_scheduled_entry_start - new_upnext_start_time
            )

        next_timeline_entry: TimelineEntryBase | None = None
        if next_schedule_entry:
            next_timeline_entry = await next_schedule_entry.get_next_timeline_entry(
                cursor, request_line, target_song_length
            )

        if next_timeline_entry is None:
            new_election = await Election.create(
                cursor, {"elec_type": "Election", "sched_id": None, "sid": sid}
            )
            await new_election.fill(cursor, request_line, target_song_length)
            next_timeline_entry = new_election

        timeline.upnext.append(next_timeline_entry)

        await write_updated_request_line_to_db(cursor, sid, request_line)
        await update_request_expire_times(cursor)
