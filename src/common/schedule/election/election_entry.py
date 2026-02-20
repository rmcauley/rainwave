from psycopg import sql
from typing import TypedDict

from common.db.build_insert import build_insert
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation


class ElectionEntryType:
    conflict = 0
    warn = 1
    normal = 2
    queue = 3
    request = 4


class ElectionEntryCreate(TypedDict):
    song_id: int
    elec_id: int
    entry_type: int
    entry_position: int
    entry_votes: int


class ElectionEntryRow(ElectionEntryCreate):
    entry_id: int


class ElectionEntry(ElectionEntryRow):
    elec_request_user_id: int | None
    elec_request_username: str | None
    song_on_station: SongOnStation


async def create_election_entry(
    cursor: RainwaveCursor,
    election_id: int,
    song_on_station: SongOnStation,
    entry_position: int,
    entry_type: int,
    elec_request_user_id: int | None,
    elec_request_username: str | None,
) -> ElectionEntry:
    to_create: ElectionEntryCreate = {
        "elec_id": election_id,
        "entry_position": entry_position,
        "entry_type": entry_type,
        "entry_votes": 0,
        "song_id": song_on_station.id,
    }
    entry = await cursor.fetch_row(
        build_insert("r4_election_entries", list(to_create.keys()))
        + sql.SQL(" RETURNING *"),
        to_create,
        row_type=ElectionEntryRow,
    )
    if entry is None:
        raise Exception("Could not get election entry that was just created!")
    return {
        "entry_id": entry["entry_id"],
        "elec_id": entry["elec_id"],
        "entry_position": entry["entry_position"],
        "entry_type": entry["entry_type"],
        "entry_votes": entry["entry_votes"],
        "song_id": entry["song_id"],
        "elec_request_user_id": elec_request_user_id,
        "elec_request_username": elec_request_username,
        "song_on_station": song_on_station,
    }
