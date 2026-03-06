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


timeline_by_station: dict[int, TimelineOnStation] = {}


def update_timeline(sid: int, timeline: TimelineOnStation) -> None:
    timeline_by_station[sid] = timeline


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
        currently_playing = await Election.create(
            cursor,
            {"elec_type": "Election", "sched_id": None, "sid": sid},
            sched_name=None,
            sched_url=None,
        )
        await currently_playing.fill(cursor, [], None)
        await currently_playing.start(cursor)

    upnext_schedule_entry = await get_schedule_entry_at_time(
        cursor, sid, int(timestamp()) + currently_playing.length()
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
