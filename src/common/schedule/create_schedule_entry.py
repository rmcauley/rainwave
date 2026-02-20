from psycopg import sql
from common.db.build_insert import build_insert
from common.db.cursor import RainwaveCursor
from common.schedule.schedule_entry_types import (
    ScheduleEntryInsertRow,
    ScheduleEntryRow,
)


async def create_schedule_entry(
    cursor: RainwaveCursor, data: ScheduleEntryInsertRow
) -> ScheduleEntryRow:
    inserted = await cursor.fetch_row(
        build_insert(
            "r4_schedule",
            list(
                data.keys(),
            ),
        )
        + sql.SQL(" RETURNING *"),
        data,
        row_type=ScheduleEntryRow,
    )
    if not inserted:
        raise Exception("Could not get returning row from schedule entry insertion.")
    return inserted
