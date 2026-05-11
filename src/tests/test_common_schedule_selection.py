from __future__ import annotations

import asyncio
from time import time as timestamp
from typing import Any, cast

import pytest

from common import config
from common.db.cursor import RainwaveCursor
from common.playlist.song.get_random_song import (
    get_random_song,
    get_random_song_ignore_all,
    get_random_song_ignore_requests,
    get_random_song_timed,
)
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.election.election import Election
from common.schedule.election.election_hour import ElectionHour
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.timeline import load_timeline
from common.schedule.timeline_single_song_from_history.timeline_single_song_from_history import (
    TimelineSingleSongFromHistory,
)
from tests.db import get_test_cursor
from tests.helpers import (
    clone_songs_to_sid,
    ensure_cache_connection,
    mark_songs_requestable,
)

TEMP_RANDOM_SID = 95
TEMP_HISTORY_SID = 94
TEMP_TIMELINE_SID = 93
TEMP_POWER_HOUR_SID = 92


async def _clear_temp_song_state(cursor: RainwaveCursor, sid: int) -> None:
    await cursor.update("DELETE FROM r4_song_sid WHERE sid = %s", (sid,))
    await cursor.update("DELETE FROM r4_album_sid WHERE sid = %s", (sid,))
    await cursor.update("DELETE FROM r4_song_history WHERE sid = %s", (sid,))
    await cursor.update("DELETE FROM r4_one_ups WHERE one_up_sid = %s", (sid,))
    await cursor.update("DELETE FROM r4_schedule WHERE sid = %s", (sid,))


def test_random_song_selection_fallbacks_and_timed_paths() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            await _clear_temp_song_state(cursor, TEMP_RANDOM_SID)

            song_ids = await cursor.fetch_list(
                "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 2",
                row_type=int,
            )
            assert len(song_ids) == 2
            song_lengths: list[int] = []
            album_ids: list[int] = []
            for song_id in song_ids:
                album_id = await cursor.fetch_var(
                    "SELECT album_id FROM r4_songs WHERE song_id = %s",
                    (song_id,),
                    var_type=int,
                )
                song_length = await cursor.fetch_var(
                    "SELECT song_length FROM r4_songs WHERE song_id = %s",
                    (song_id,),
                    var_type=int,
                )
                assert album_id is not None
                assert song_length is not None
                album_ids.append(album_id)
                song_lengths.append(song_length)
                await cursor.update(
                    """
                    INSERT INTO r4_song_sid (
                        song_id, sid, song_exists, song_cool, song_request_only, song_elec_blocked
                    ) VALUES (%s, %s, TRUE, FALSE, FALSE, FALSE)
                    ON CONFLICT (song_id, sid) DO UPDATE SET
                        song_exists = EXCLUDED.song_exists,
                        song_cool = EXCLUDED.song_cool,
                        song_request_only = EXCLUDED.song_request_only,
                        song_elec_blocked = EXCLUDED.song_elec_blocked
                    """,
                    (song_id, TEMP_RANDOM_SID),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_album_sid (album_id, sid, album_exists, album_song_count, album_requests_pending)
                    VALUES (%s, %s, TRUE, 1, NULL)
                    ON CONFLICT (album_id, sid) DO UPDATE SET
                        album_exists = EXCLUDED.album_exists,
                        album_song_count = EXCLUDED.album_song_count,
                        album_requests_pending = EXCLUDED.album_requests_pending
                    """,
                    (album_id, TEMP_RANDOM_SID),
                )

            random_song = await get_random_song_ignore_all(cursor, TEMP_RANDOM_SID)
            assert random_song.sid == TEMP_RANDOM_SID
            assert random_song.id in song_ids

            await cursor.update(
                """
                UPDATE r4_song_sid
                SET song_cool = TRUE, song_request_only = TRUE, song_elec_blocked = TRUE
                WHERE sid = %s
                """,
                (TEMP_RANDOM_SID,),
            )
            fallback_song = await get_random_song_ignore_requests(
                cursor, TEMP_RANDOM_SID
            )
            assert fallback_song.id in song_ids

            await cursor.update(
                """
                UPDATE r4_song_sid
                SET song_cool = FALSE, song_request_only = FALSE, song_elec_blocked = FALSE
                WHERE sid = %s
                """,
                (TEMP_RANDOM_SID,),
            )
            await cursor.update(
                "UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE sid = %s",
                (TEMP_RANDOM_SID,),
            )
            request_fallback_song = await get_random_song(cursor, TEMP_RANDOM_SID)
            assert request_fallback_song.id in song_ids

            await cursor.update(
                "UPDATE r4_album_sid SET album_requests_pending = NULL WHERE sid = %s",
                (TEMP_RANDOM_SID,),
            )
            direct_song = await get_random_song_timed(
                cursor, TEMP_RANDOM_SID, target_seconds=None, target_delta=30
            )
            assert direct_song.id in song_ids

            timed_song = await get_random_song_timed(
                cursor,
                TEMP_RANDOM_SID,
                target_seconds=song_lengths[0],
                target_delta=1,
            )
            assert timed_song.id in song_ids

            timed_fallback_song = await get_random_song_timed(
                cursor,
                TEMP_RANDOM_SID,
                target_seconds=max(song_lengths) + 10_000,
                target_delta=10,
            )
            assert timed_fallback_song.id in song_ids

    asyncio.run(_run())


def test_election_hour_creation_queueing_and_empty_in_progress_paths() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                song_ids = await cursor.fetch_list(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 6",
                    row_type=int,
                )
                assert len(song_ids) == 6
                await mark_songs_requestable(cursor, 1, song_ids)

                now = int(timestamp())
                schedule_row = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now - 5,
                        "sched_end": now + 600,
                        "sched_type": "PVPElection",
                        "sched_name": "PVP Test",
                        "sched_url": "/pvp",
                        "sid": 1,
                        "sched_timed": True,
                        "sched_creator_user_id": None,
                        "sched_is_auto_ph": False,
                    },
                )
                election_hour = ElectionHour("PVPElection", schedule_row)

                assert (
                    await election_hour.has_timeline_entries_remaining(cursor) is False
                )
                created = await election_hour.get_next_timeline_entry(cursor, [], None)
                assert created.data["elec_type"] == "PVPElection"
                assert created.entries
                assert (
                    await election_hour.has_timeline_entries_remaining(cursor) is True
                )

                queued = await election_hour.get_queued_timeline_entries(cursor)
                assert len(queued) == 1
                assert queued[0].id == created.id

                await created.start(cursor)
                in_progress = await election_hour.get_timeline_entry_in_progress(cursor)
                assert in_progress is not None
                assert in_progress.id == created.id

                empty = await Election.create(
                    cursor,
                    {
                        "elec_type": "PVPElection",
                        "sched_id": schedule_row["sched_id"],
                        "sid": 1,
                    },
                    sched_name=schedule_row["sched_name"],
                    sched_url=schedule_row["sched_url"],
                )
                await cursor.update(
                    """
                    UPDATE r4_elections
                    SET elec_in_progress = TRUE, elec_used = FALSE, elec_start_actual = %s
                    WHERE elec_id = %s
                    """,
                    (now, empty.id),
                )
                empty_result = await election_hour.get_timeline_entry_in_progress(
                    cursor
                )
                assert empty_result is None
                assert (
                    await cursor.fetch_var(
                        "SELECT elec_used FROM r4_elections WHERE elec_id = %s",
                        (empty.id,),
                        var_type=bool,
                    )
                    is True
                )

    asyncio.run(_run())


def test_timeline_single_song_from_history_load_and_to_api() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            await _clear_temp_song_state(cursor, TEMP_HISTORY_SID)

            song_ids = await cursor.fetch_list(
                "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 6",
                row_type=int,
            )
            assert len(song_ids) == 6

            history_time = int(timestamp())
            for offset, song_id in enumerate(song_ids):
                album_id = await cursor.fetch_var(
                    "SELECT album_id FROM r4_songs WHERE song_id = %s",
                    (song_id,),
                    var_type=int,
                )
                assert album_id is not None
                await cursor.update(
                    """
                    INSERT INTO r4_song_sid (song_id, sid, song_exists)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (song_id, sid) DO UPDATE SET song_exists = EXCLUDED.song_exists
                    """,
                    (song_id, TEMP_HISTORY_SID),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_album_sid (album_id, sid, album_exists, album_song_count)
                    VALUES (%s, %s, TRUE, 1)
                    ON CONFLICT (album_id, sid) DO UPDATE SET
                        album_exists = EXCLUDED.album_exists,
                        album_song_count = EXCLUDED.album_song_count
                    """,
                    (album_id, TEMP_HISTORY_SID),
                )
                await cursor.update(
                    "INSERT INTO r4_song_history (songhist_time, sid, song_id) VALUES (%s, %s, %s)",
                    (history_time - offset * 180, TEMP_HISTORY_SID, song_id),
                )

            loaded = await TimelineSingleSongFromHistory.load_last_5(
                cursor, TEMP_HISTORY_SID
            )
            assert len(loaded) == 5
            latest = loaded[0]
            oldest = loaded[-1]
            assert latest.get_song_on_station_to_play().id == song_ids[-1]
            assert oldest.get_song_on_station_to_play().id == song_ids[1]
            api_payload = await latest.to_api(cursor)
            assert api_payload["used"] is True
            assert api_payload["voting_allowed"] is False
            assert api_payload["songs"][0]["id"] == song_ids[-1]
            assert api_payload["end"] > api_payload["start"]
            await latest.start(cursor)
            await latest.finish(cursor)

    asyncio.run(_run())


def test_power_hour_empty_used_and_fill_unrated_paths() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                await _clear_temp_song_state(cursor, TEMP_POWER_HOUR_SID)
                song_ids = await cursor.fetch_list(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 4",
                    row_type=int,
                )
                assert len(song_ids) == 4
                await clone_songs_to_sid(cursor, TEMP_POWER_HOUR_SID, song_ids)

                now = int(timestamp())
                empty_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now,
                        "sched_end": now + 60,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Empty Producer",
                        "sched_url": "/empty",
                        "sid": TEMP_POWER_HOUR_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                empty_power_hour = PowerHour("OneUpProducer", empty_schedule)
                assert await empty_power_hour.get_queued_timeline_entries(cursor) == []
                assert (
                    await empty_power_hour.get_next_timeline_entry(cursor, [], None)
                    is None
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT sched_used FROM r4_schedule WHERE sched_id = %s",
                        (empty_schedule["sched_id"],),
                        var_type=bool,
                    )
                    is True
                )
                empty_power_hour.data["sched_used"] = True
                with pytest.raises(Exception):
                    await empty_power_hour.change_start(cursor, now + 120)

                actual_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": None,
                        "sched_end": None,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Actual Producer",
                        "sched_url": "/actual",
                        "sid": TEMP_POWER_HOUR_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                await cursor.update(
                    "UPDATE r4_schedule SET sched_start_actual = %s WHERE sched_id = %s",
                    (now, actual_schedule["sched_id"]),
                )
                actual_schedule["sched_start_actual"] = now
                actual_power_hour = PowerHour("OneUpProducer", actual_schedule)
                await cast(Any, actual_power_hour)._update_length(cursor)
                assert (
                    await cursor.fetch_var(
                        "SELECT sched_end FROM r4_schedule WHERE sched_id = %s",
                        (actual_schedule["sched_id"],),
                        var_type=int,
                    )
                ) == now

                limited_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now + 120,
                        "sched_end": None,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Limited Producer",
                        "sched_url": "/limited",
                        "sid": TEMP_POWER_HOUR_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                limited_power_hour = PowerHour("OneUpProducer", limited_schedule)
                await limited_power_hour.fill_unrated(cursor, max_length=0)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_one_ups WHERE sched_id = %s",
                        (limited_schedule["sched_id"],),
                        var_type=int,
                    )
                    == 1
                )

                full_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now + 240,
                        "sched_end": None,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Full Producer",
                        "sched_url": "/full",
                        "sid": TEMP_POWER_HOUR_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                full_power_hour = PowerHour("OneUpProducer", full_schedule)
                await full_power_hour.fill_unrated(cursor, max_length=100_000)
                full_count = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_one_ups WHERE sched_id = %s",
                    (full_schedule["sched_id"],),
                    var_type=int,
                )
                assert full_count is not None
                assert full_count >= 3

    asyncio.run(_run())


def test_load_timeline_uses_current_and_upnext_schedule_entries() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                await _clear_temp_song_state(cursor, TEMP_TIMELINE_SID)
                song_ids = await cursor.fetch_list(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 4",
                    row_type=int,
                )
                assert len(song_ids) == 4
                await clone_songs_to_sid(cursor, TEMP_TIMELINE_SID, song_ids)
                config.stations[TEMP_TIMELINE_SID] = {**config.stations[1]}

                current_song_length = await cursor.fetch_var(
                    "SELECT song_length FROM r4_songs WHERE song_id = %s",
                    (song_ids[0],),
                    var_type=int,
                )
                assert current_song_length is not None

                now = int(timestamp())
                current_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now - 10,
                        "sched_end": now + 600,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Current Producer",
                        "sched_url": "/current",
                        "sid": TEMP_TIMELINE_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                current_power_hour = PowerHour("OneUpProducer", current_schedule)
                await current_power_hour.add_song_id(cursor, song_ids[0], order=0)
                current_entry = await current_power_hour.get_next_timeline_entry(
                    cursor, [], None
                )
                assert current_entry is not None

                future_schedule = await create_schedule_entry(
                    cursor,
                    {
                        "sched_start": now + current_song_length + 5,
                        "sched_end": now + current_song_length + 605,
                        "sched_type": "OneUpProducer",
                        "sched_name": "Future Producer",
                        "sched_url": "/future",
                        "sid": TEMP_TIMELINE_SID,
                        "sched_timed": True,
                        "sched_creator_user_id": 2,
                        "sched_is_auto_ph": False,
                    },
                )
                future_power_hour = PowerHour("OneUpProducer", future_schedule)
                await future_power_hour.add_song_id(cursor, song_ids[1], order=0)
                future_entry = await future_power_hour.get_next_timeline_entry(
                    cursor, [], None
                )
                assert future_entry is not None

                timeline = await load_timeline(cursor, TEMP_TIMELINE_SID)
                assert timeline.current is not None
                assert (
                    timeline.current.get_song_on_station_to_play().id
                    == current_entry.get_song_on_station_to_play().id
                )
                assert any(
                    entry.get_song_on_station_to_play().id
                    == future_entry.get_song_on_station_to_play().id
                    for entry in timeline.upnext
                )
                assert len(timeline.upnext) >= 2

    asyncio.run(_run())
