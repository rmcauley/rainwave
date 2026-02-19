from common import log
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.request_line_types import RequestLineEntry
from common.schedule.election.election import Election, ElectionType
from common.schedule.schedule_models.schedule_entry_base import ScheduleEntry


class ElectionHour(ScheduleEntry):
    async def has_timeline_entries_remaining(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> bool:
        return (
            await cursor.fetch_guaranteed(
                "SELECT COUNT(elec_id) FROM r4_elections WHERE sched_id = %s AND sid = %s AND elec_used = FALSE",
                (self.sid, self.id),
                default=0,
                var_type=int,
            )
        ) > 0

    async def get_next_timeline_entry(
        self,
        cursor: RainwaveCursor | RainwaveCursorTx,
        request_line: list[RequestLineEntry],
        target_song_length: int | None = None,
    ) -> Election:
        elec_id = await cursor.fetch_var(
            "SELECT elec_id FROM r4_elections WHERE elec_used = FALSE AND sched_id = %s ORDER BY elec_id LIMIT 1",
            (self.id,),
            var_type=int,
        )
        log.debug(
            "load_election",
            "Check for next election (sched_id %s): %s" % (self.id, elec_id),
        )
        if elec_id:
            return await Election.load_by_id(cursor, elec_id)

        elec_type: ElectionType = "Election"
        if (
            self.data["sched_type"] == "PVPElection"
            or self.data["sched_type"] == "PVPHour"
        ):
            elec_type = "PVPElection"

        election = await Election.create(
            cursor, {"elec_type": elec_type, "sched_id": self.id, "sid": self.sid}
        )
        await election.fill(cursor, request_line, target_song_length)
        return election

    async def get_timeline_entry_in_progress(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> Election | None:
        elec_id = await cursor.fetch_var(
            "SELECT elec_id FROM r4_elections WHERE elec_in_progress = TRUE sched_id = %s ORDER BY elec_id DESC LIMIT 1",
            (self.id,),
            var_type=int,
        )
        log.debug(
            "load_election",
            "Check for in-progress elections (sched_id %s): %s" % (self.id, elec_id),
        )
        if elec_id:
            elec = await Election.load_by_id(cursor, elec_id)
            if not elec.entries:
                log.warn("load_election", "Election ID %s is empty.  Marking as used.")
                await cursor.update(
                    "UPDATE r4_elections SET elec_used = TRUE WHERE elec_id = %s",
                    (elec.id,),
                )
                return None
            return elec

        return None
