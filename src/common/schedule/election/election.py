import math
import random
from time import time as timestamp

from psycopg import sql
from typing import Literal, Self, TypedDict

from common import config, log
from common.db.build_insert import build_insert
from common.db.cursor import RainwaveCursor
from common.playlist.song.get_random_song import get_random_song_timed
from common.playlist.song.model.song_on_station import SongOnStation
from common.requests.request_line_types import RequestLineEntry
from common.requests.request_sequencing import (
    get_next_request_and_mark_as_fulfilled_if_needed,
    get_next_request_ignoring_sequencing,
)
from common.schedule.election.election_entry import (
    ElectionEntry,
    ElectionEntryRow,
    ElectionEntryType,
)
from common.schedule.election.election_entry import create_election_entry
from common.schedule.schedule_models.timeline_entry_base import (
    TimelineEntryAlreadyUsed,
    TimelineEntryBase,
)


class ElectionDoesNotExist(Exception):
    pass


class ElectionEmptyException(Exception):
    pass


class ElectionNotStartedYetError(Exception):
    pass


ElectionType = Literal["Election", "PVPElection"]


class ElectionCreationData(TypedDict):
    sid: int
    sched_id: int | None
    elec_type: ElectionType


class ElectionRow(ElectionCreationData):
    elec_id: int
    elec_start_actual: int | None
    elec_in_progress: bool
    elec_used: bool


class EntryVotesRow(TypedDict):
    entry_id: int
    entry_votes: int


class Election(TimelineEntryBase):
    def __init__(self, data: ElectionRow, entries: list[ElectionEntry]) -> None:
        super().__init__(data["elec_id"], data["elec_start_actual"])
        self.id = data["elec_id"]
        self.type = data["elec_type"]
        self.sid = data["sid"]
        self.data = data
        self.entries = entries

    @classmethod
    async def load_by_id(cls, cursor: RainwaveCursor, elec_id: int) -> Self:
        election_row = await cursor.fetch_row(
            "SELECT * FROM r4_elections WHERE elec_id = %s",
            (elec_id,),
            row_type=ElectionRow,
        )
        if not election_row:
            raise ElectionDoesNotExist

        entries: list[ElectionEntry] = []
        for entry_row in await cursor.fetch_all(
            "SELECT * FROM r4_election_entries WHERE elec_id = %s",
            (elec_id,),
            row_type=ElectionEntryRow,
        ):
            song_on_station = await SongOnStation.load(
                cursor, entry_row["song_id"], election_row["sid"]
            )
            entry: ElectionEntry = {
                "elec_id": entry_row["elec_id"],
                "elec_request_user_id": None,
                "elec_request_username": None,
                "entry_id": entry_row["entry_id"],
                "entry_position": entry_row["entry_position"],
                "entry_type": entry_row["entry_type"],
                "entry_votes": entry_row["entry_votes"],
                "song_id": entry_row["song_id"],
                "song_on_station": song_on_station,
            }
            entries.append(entry)

        return cls(election_row, entries)

    @classmethod
    async def create(cls, cursor: RainwaveCursor, data: ElectionCreationData) -> Self:
        to_create = {
            "elec_type": data["elec_type"],
            "sched_id": data["sched_id"],
            "sid": data["sid"],
        }
        election_row = await cursor.fetch_row(
            build_insert("r4_elections", list(to_create.keys()))
            + sql.SQL(" RETURNING *"),
            to_create,
            row_type=ElectionRow,
        )
        if not election_row:
            raise Exception("For for just-created election was not found.")
        return cls(election_row, [])

    def length(self) -> int:
        if self.data["elec_used"] or self.data["elec_in_progress"]:
            if len(self.entries) == 0:
                return 0
            else:
                return self.entries[0]["song_on_station"].data["song_length"]
        else:
            totalsec = 0
            for entry in self.entries:
                totalsec += entry["song_on_station"].data["song_length"]
            if totalsec == 0:
                return 0
            return math.floor(totalsec / len(self.entries))

    async def start(self, cursor: RainwaveCursor) -> None:
        if self.data["elec_used"]:
            raise TimelineEntryAlreadyUsed()

        entry_results = await cursor.fetch_all(
            "SELECT entry_id, entry_votes FROM r4_election_entries WHERE elec_id = %s",
            (self.id,),
            row_type=EntryVotesRow,
        )
        for entry in self.entries:
            for entry_result in entry_results:
                if entry_result["entry_id"] == entry["entry_id"]:
                    entry["entry_votes"] = entry_result["entry_votes"]
        random.shuffle(self.entries)
        self.entries = sorted(self.entries, key=lambda entry: entry["entry_type"])
        self.entries = sorted(self.entries, key=lambda entry: entry["entry_votes"])
        self.entries.reverse()

        # at this point, self.entries[0] is the winner
        total_votes = 0
        for entry_index, entry in enumerate(self.entries):
            total_votes += entry["entry_votes"]
            entry["entry_position"] = entry_index
            await cursor.update(
                "UPDATE r4_election_entries SET entry_position = %s WHERE entry_id = %s",
                (entry_index, entry["entry_id"]),
            )
        self.data["elec_start_actual"] = int(timestamp())
        self.data["elec_in_progress"] = True
        self.data["elec_used"] = True
        await cursor.update(
            "UPDATE r4_elections SET elec_in_progress = TRUE, elec_start_actual = %s, elec_used = TRUE WHERE elec_id = %s",
            (self.data["elec_start_actual"], self.id),
        )

    async def finish(self, cursor: RainwaveCursor) -> None:
        self.data["elec_in_progress"] = False
        self.data["elec_used"] = True

        await cursor.update(
            "UPDATE r4_elections SET elec_in_progress = FALSE, elec_used = TRUE WHERE elec_id = %s",
            (self.id,),
        )

    def get_song_on_station_to_play(self) -> SongOnStation:
        if not self.data["elec_used"] and not self.data["elec_in_progress"]:
            raise ElectionNotStartedYetError()

        return self.entries[0]["song_on_station"]

    async def fill(
        self,
        cursor: RainwaveCursor,
        request_line: list[RequestLineEntry],
        target_song_length: int | None = None,
    ) -> None:
        if self.data["elec_type"] == "Election" and target_song_length is None:
            request = await get_next_request_and_mark_as_fulfilled_if_needed(
                self.sid, request_line
            )
            if request:
                request_line_entry, request_song_row = request
                song_on_station = await SongOnStation.load(
                    cursor, request_song_row["id"], self.sid
                )
                entry = await create_election_entry(
                    cursor,
                    self.id,
                    song_on_station,
                    len(self.entries),
                    ElectionEntryType.request,
                    elec_request_user_id=request_line_entry["user_id"],
                    elec_request_username=request_line_entry["username"],
                )
                await song_on_station.start_election_block(cursor)
                self.entries.append(entry)
        elif self.data["elec_type"] == "PVPElection":
            for _i in range(0, 2):
                request = await get_next_request_ignoring_sequencing(
                    self.sid, request_line
                )
                if request:
                    request_line_entry, request_song_row = request
                    song_on_station = await SongOnStation.load(
                        cursor, request_song_row["id"], self.sid
                    )
                    entry = await create_election_entry(
                        cursor,
                        self.id,
                        song_on_station,
                        len(self.entries),
                        ElectionEntryType.request,
                        elec_request_user_id=request_line_entry["user_id"],
                        elec_request_username=request_line_entry["username"],
                    )
                    await song_on_station.start_election_block(cursor)
                    self.entries.append(entry)

        max_num_songs = 2 if self.data["elec_type"] == "PVPElection" else 3

        for _i in range(len(self.entries), max_num_songs):
            if target_song_length is None and len(self.entries) > 0:
                target_song_length = self.entries[0]["song_on_station"].data[
                    "song_length"
                ]
                log.debug(
                    "elec_fill",
                    "Second song in election, aligning to length %s"
                    % target_song_length,
                )
            song_on_station = await get_random_song_timed(
                cursor,
                self.sid,
                target_seconds=target_song_length,
                target_delta=config.stations[self.sid]["song_lookup_length_delta"],
            )
            entry = await create_election_entry(
                cursor,
                self.id,
                song_on_station,
                len(self.entries),
                ElectionEntryType.normal,
                None,
                None,
            )
            await song_on_station.start_election_block(cursor)
            self.entries.append(entry)
