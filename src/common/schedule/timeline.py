from time import time as timestamp
from dataclasses import dataclass

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.election.election import Election
from common.schedule.generate_next_timeline_entries import (
    generate_next_timeline_entries,
)
from common.schedule.get_schedule_at_time import (
    get_current_schedule_entry,
    get_schedule_entry_at_time,
)
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryBase


@dataclass
class TimelineOnStation:
    history: list[SongOnStation]
    current: TimelineEntryBase
    upnext: list[TimelineEntryBase]


timeline_by_station: dict[int, TimelineOnStation] = {}


def update_timeline(sid: int, timeline: TimelineOnStation) -> None:
    timeline_by_station[sid] = timeline


async def load_timeline(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int
) -> TimelineOnStation:
    history: list[SongOnStation] = []
    for song_id in await cursor.fetch_list(
        "SELECT song_id FROM r4_song_history JOIN r4_song_sid USING (song_id, sid) JOIN r4_songs USING (song_id) WHERE sid = %s AND song_exists = TRUE AND song_verified = TRUE ORDER BY songhist_time DESC LIMIT 5",
        (sid,),
        row_type=int,
    ):
        history.insert(0, await SongOnStation.load(cursor, song_id, sid))

    currently_playing: TimelineEntryBase | None = None
    currently_scheduled = await get_current_schedule_entry(cursor, sid)
    if currently_scheduled:
        currently_playing = await currently_scheduled.get_timeline_entry_in_progress(
            cursor
        )
    if not currently_playing:
        currently_playing = await Election.create(
            cursor, {"elec_type": "Election", "sched_id": None, "sid": sid}
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
