from typing import TypedDict

from api import rainwave_typeddicts
from common.cache.station_cache import cache_get_station, cache_set_station
from common.db.cursor import RainwaveCursor


class LiveVotingRow(TypedDict):
    entry_id: int
    entry_votes: int
    song_id: int


async def update_live_voting_cache(
    cursor: RainwaveCursor, sid: int, elec_id: int
) -> rainwave_typeddicts.LiveVoting:
    live_voting_by_timeline_entry: rainwave_typeddicts.LiveVoting = (
        await cache_get_station(sid, "live_voting")
    ) or {}
    live_voting_by_timeline_entry[str(elec_id)] = await cursor.fetch_all(
        "SELECT entry_id, entry_votes, song_id FROM r4_election_entries WHERE elec_id = %s",
        (elec_id,),
        row_type=LiveVotingRow,
    )
    await cache_set_station(sid, "live_voting", live_voting_by_timeline_entry)
    return live_voting_by_timeline_entry
