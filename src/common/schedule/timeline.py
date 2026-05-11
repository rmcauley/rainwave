from time import time as timestamp

from common.db.cursor import RainwaveCursor
from common.schedule.election.election import Election
from common.schedule.generate_next_timeline_entries import (
    generate_next_timeline_entries,
)
from common.schedule.get_schedule_at_time import (
    get_current_schedule_entry,
    get_schedule_entry_at_time,
)
from common.schedule.timeline_single_song_from_history.timeline_single_song_from_history import (
    TimelineSingleSongFromHistory,
)
from common.schedule.timeline_types import TimelineOnStation
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


async def load_timeline(cursor: RainwaveCursor, sid: int) -> TimelineOnStation:
    history: list[TimelineEntryBase] = await TimelineSingleSongFromHistory.load_last_5(
        cursor, sid
    )

    currently_playing: TimelineEntryBase | None = None
    currently_scheduled = await get_current_schedule_entry(cursor, sid)
    if currently_scheduled:
        currently_playing = await currently_scheduled.get_timeline_entry_in_progress(
            cursor
        )
    if not currently_playing:
        unscheduled_elec_id = await cursor.fetch_var(
            """
            SELECT elec_id
            FROM r4_elections
            WHERE sid = %s
                AND sched_id IS NULL
                AND elec_in_progress = TRUE
            ORDER BY elec_start_actual DESC, elec_id DESC
            LIMIT 1
            """,
            (sid,),
            var_type=int,
        )
        if unscheduled_elec_id:
            currently_playing = await Election.load_by_id(
                cursor, unscheduled_elec_id, sched_name=None, sched_url=None
            )

    currently_playing_length = currently_playing.length() if currently_playing else 0
    upnext_schedule_entry = await get_schedule_entry_at_time(
        cursor, sid, int(timestamp()) + currently_playing_length
    )
    upnext: list[TimelineEntryBase] = []
    if upnext_schedule_entry:
        for timeline_entry in await upnext_schedule_entry.get_queued_timeline_entries(
            cursor
        ):
            upnext.append(timeline_entry)

    timeline = TimelineOnStation(history, currently_playing, upnext)

    await generate_next_timeline_entries(cursor, sid, timeline)

    return timeline
