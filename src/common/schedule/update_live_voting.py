from typing import TypedDict

from common.cache.station_cache import cache_get_station, cache_set_station
from common.db.cursor import RainwaveCursor


class LiveVotingRow(TypedDict):
    entry_id: int
    entry_votes: int
    song_id: int


LiveVotingForTimelineEntry = list[LiveVotingRow]
LiveVotingByTimelineEntry = dict[int, list[LiveVotingRow]]


async def update_live_voting_cache(
    cursor: RainwaveCursor, sid: int, elec_id: int
) -> LiveVotingByTimelineEntry:
    live_voting_by_timeline_entry: LiveVotingByTimelineEntry = (
        await cache_get_station(sid, "live_voting")
    ) or {}
    live_voting_by_timeline_entry[elec_id] = await cursor.fetch_all(
        "SELECT entry_id, entry_votes, song_id FROM r4_election_entries WHERE elec_id = %s",
        (elec_id,),
        row_type=LiveVotingRow,
    )
    await cache_set_station(sid, "live_voting", live_voting_by_timeline_entry)
    return live_voting_by_timeline_entry
