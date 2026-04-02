from __future__ import annotations

import asyncio
import math
from datetime import datetime
from typing import TypedDict

from pytz import timezone

from tests.db import get_test_cursor
from tests.helpers import clone_songs_to_sid
from tools.auto_ph import TARGET_LENGTH, get_next_start, make_auto_power_hours

TEMP_AUTO_PH_SID = 91


class AutoPhScheduleRow(TypedDict):
    sched_id: int
    sched_name: str | None
    sched_start: int | None
    sid: int


class AutoPhSongRow(TypedDict):
    song_id: int
    song_length: int


class SongNewPlayedRow(TypedDict):
    song_id: int
    song_new_played: bool


async def _clear_temp_auto_ph_state(sid: int) -> None:
    async with get_test_cursor() as cursor:
        await cursor.update("DELETE FROM r4_one_ups WHERE one_up_sid = %s", (sid,))
        await cursor.update("DELETE FROM r4_schedule WHERE sid = %s", (sid,))
        await cursor.update("DELETE FROM r4_song_sid WHERE sid = %s", (sid,))
        await cursor.update("DELETE FROM r4_album_sid WHERE sid = %s", (sid,))


def test_auto_ph_get_next_start_skips_conflicts_and_disallowed_days() -> None:
    pacific = timezone("US/Pacific")
    monday = pacific.localize(datetime(2026, 4, 6, 11, 0, 0))
    thursday = pacific.localize(datetime(2026, 4, 2, 11, 0, 0))

    assert get_next_start(monday, monday) == pacific.localize(
        datetime(2026, 4, 7, 11, 0, 0)
    )
    assert get_next_start(thursday, thursday) == pacific.localize(
        datetime(2026, 4, 6, 11, 0, 0)
    )


def test_make_auto_power_hours_creates_entries_on_requested_station() -> None:
    async def _run() -> None:
        await _clear_temp_auto_ph_state(TEMP_AUTO_PH_SID)

        selected_songs: list[AutoPhSongRow] = []
        original_new_played: dict[int, bool] = {}
        try:
            async with get_test_cursor() as cursor:
                candidate_songs = await cursor.fetch_all(
                    """
                    SELECT r4_songs.song_id, r4_songs.song_length
                    FROM r4_song_sid
                    JOIN r4_songs USING (song_id)
                    WHERE r4_song_sid.sid = 1
                        AND r4_song_sid.song_exists = TRUE
                        AND r4_songs.song_verified = TRUE
                    ORDER BY r4_songs.song_length DESC, r4_songs.song_id
                    LIMIT 64
                    """,
                    row_type=AutoPhSongRow,
                )
                assert candidate_songs

                total_seconds = 0
                for row in candidate_songs:
                    selected_songs.append(row)
                    total_seconds += row["song_length"]
                    if total_seconds > TARGET_LENGTH:
                        break

                assert total_seconds > TARGET_LENGTH
                expected_parts = int(math.ceil(total_seconds / TARGET_LENGTH))
                assert expected_parts >= 2

                song_ids = [row["song_id"] for row in selected_songs]
                await clone_songs_to_sid(cursor, TEMP_AUTO_PH_SID, song_ids)

                original_rows = await cursor.fetch_all(
                    """
                    SELECT song_id, song_new_played
                    FROM r4_songs
                    WHERE song_id = ANY(%s)
                    ORDER BY song_id
                    """,
                    (song_ids,),
                    row_type=SongNewPlayedRow,
                )
                original_new_played = {
                    row["song_id"]: row["song_new_played"] for row in original_rows
                }
                for song_id in song_ids:
                    await cursor.update(
                        "UPDATE r4_songs SET song_new_played = FALSE WHERE song_id = %s",
                        (song_id,),
                    )

                await make_auto_power_hours(
                    cursor,
                    TEMP_AUTO_PH_SID,
                    list(selected_songs),
                    total_seconds,
                )

                schedule_rows = await cursor.fetch_all(
                    """
                    SELECT sched_id, sched_name, sched_start, sid
                    FROM r4_schedule
                    WHERE sid = %s
                    ORDER BY sched_start, sched_id
                    """,
                    (TEMP_AUTO_PH_SID,),
                    row_type=AutoPhScheduleRow,
                )
                assert len(schedule_rows) == expected_parts * 2
                assert all(row["sid"] == TEMP_AUTO_PH_SID for row in schedule_rows)

                north_america_rows = [
                    row
                    for row in schedule_rows
                    if row["sched_name"] and "Reprisal" not in row["sched_name"]
                ]
                reprisal_rows = [
                    row
                    for row in schedule_rows
                    if row["sched_name"] and "Reprisal" in row["sched_name"]
                ]
                assert len(north_america_rows) == expected_parts
                assert len(reprisal_rows) == expected_parts
                assert (
                    len({row["sched_start"] for row in north_america_rows})
                    == expected_parts
                )
                for north_america_row, reprisal_row in zip(
                    north_america_rows, reprisal_rows, strict=True
                ):
                    assert north_america_row["sched_start"] is not None
                    assert reprisal_row["sched_start"] is not None
                    assert reprisal_row["sched_start"] > north_america_row["sched_start"]

                one_up_sids = await cursor.fetch_list(
                    """
                    SELECT DISTINCT one_up_sid
                    FROM r4_one_ups
                    JOIN r4_schedule USING (sched_id)
                    WHERE r4_schedule.sid = %s
                    ORDER BY one_up_sid
                    """,
                    (TEMP_AUTO_PH_SID,),
                    row_type=int,
                )
                assert one_up_sids == [TEMP_AUTO_PH_SID]
        finally:
            if original_new_played:
                async with get_test_cursor() as cursor:
                    for song_id, song_new_played in original_new_played.items():
                        await cursor.update(
                            "UPDATE r4_songs SET song_new_played = %s WHERE song_id = %s",
                            (song_new_played, song_id),
                        )
            await _clear_temp_auto_ph_state(TEMP_AUTO_PH_SID)

    asyncio.run(_run())
