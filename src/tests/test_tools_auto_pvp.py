from __future__ import annotations

import asyncio
from datetime import datetime
from typing import TypedDict

from pytz import timezone

from common.schedule.create_schedule_entry import create_schedule_entry
from tests.db import get_test_cursor
from tools.auto_pvp import (
    get_auto_pvp_schedule_entry,
    station_for_day_of_week_america,
    station_for_day_of_week_europe,
)


class AutoPvpScheduleRow(TypedDict):
    sched_end: int | None
    sched_is_auto_ph: bool | None
    sched_name: str | None
    sched_start: int | None
    sched_type: str
    sid: int


async def _delete_schedule_by_start(sched_start: int) -> None:
    async with get_test_cursor() as cursor:
        await cursor.update(
            "DELETE FROM r4_schedule WHERE sched_start = %s", (sched_start,)
        )


def test_get_auto_pvp_schedule_entry_covers_normal_special_and_skip_paths() -> None:
    pacific = timezone("US/Pacific")

    monday = pacific.localize(datetime(2026, 4, 6, 10, 0, 0))
    monday_entry = get_auto_pvp_schedule_entry(monday, station_for_day_of_week_america)
    assert monday_entry is not None
    assert monday_entry["sid"] == 4
    assert monday_entry["sched_name"] == "PvP Hour"
    assert monday_entry["sched_start"] == int(monday.timestamp())
    assert monday_entry["sched_end"] == int(monday.timestamp()) + 3600
    assert monday_entry["sched_type"] == "PVPElection"
    assert monday_entry["sched_is_auto_ph"] is False

    sunday = pacific.localize(datetime(2026, 4, 12, 10, 0, 0))
    chill_entry = get_auto_pvp_schedule_entry(sunday, station_for_day_of_week_america)
    assert chill_entry is not None
    assert chill_entry["sid"] == 6
    assert chill_entry["sched_name"] == "Chill-Off Hour"

    assert get_auto_pvp_schedule_entry(monday, (0, 0, 0, 0, 0, 0, 0)) is None


def test_auto_pvp_schedule_entries_insert_with_expected_shape() -> None:
    async def _run() -> None:
        pacific = timezone("US/Pacific")
        amsterdam = timezone("Europe/Amsterdam")

        pacific_start = pacific.localize(datetime(2030, 4, 8, 10, 0, 0))
        europe_start = amsterdam.localize(datetime(2030, 4, 8, 10, 0, 0))

        pacific_entry = get_auto_pvp_schedule_entry(
            pacific_start, station_for_day_of_week_america
        )
        europe_entry = get_auto_pvp_schedule_entry(
            europe_start, station_for_day_of_week_europe
        )
        assert pacific_entry is not None
        assert europe_entry is not None

        try:
            await _delete_schedule_by_start(pacific_entry["sched_start"] or 0)
            await _delete_schedule_by_start(europe_entry["sched_start"] or 0)

            async with get_test_cursor() as cursor:
                await create_schedule_entry(cursor, pacific_entry)
                await create_schedule_entry(cursor, europe_entry)

                inserted_rows = await cursor.fetch_all(
                    """
                    SELECT sched_start, sched_end, sched_name, sched_type, sid, sched_is_auto_ph
                    FROM r4_schedule
                    WHERE sched_start IN (%s, %s)
                    ORDER BY sched_start
                    """,
                    (pacific_entry["sched_start"], europe_entry["sched_start"]),
                    row_type=AutoPvpScheduleRow,
                )

                assert len(inserted_rows) == 2
                assert inserted_rows[0] == {
                    "sched_start": europe_entry["sched_start"],
                    "sched_end": europe_entry["sched_end"],
                    "sched_name": europe_entry["sched_name"],
                    "sched_type": "PVPElection",
                    "sid": europe_entry["sid"],
                    "sched_is_auto_ph": False,
                }
                assert inserted_rows[1] == {
                    "sched_start": pacific_entry["sched_start"],
                    "sched_end": pacific_entry["sched_end"],
                    "sched_name": pacific_entry["sched_name"],
                    "sched_type": "PVPElection",
                    "sid": pacific_entry["sid"],
                    "sched_is_auto_ph": False,
                }
        finally:
            await _delete_schedule_by_start(int(pacific_start.timestamp()))
            await _delete_schedule_by_start(int(europe_start.timestamp()))

    asyncio.run(_run())
