from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
from time import time as timestamp
from typing import cast

import pytest

from common import stations
from common.playlist.album.get_album_on_station import (
    AlbumNotFoundError,
    get_album_on_station,
    get_many_album_on_station,
)
from common.playlist.song.disable_song import disable_song
from common.playlist.song.model.song_file import SongFile
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.duplicate_schedule_entry import duplicate_schedule_entry
from common.schedule.get_schedule_entry_from_row import get_schedule_entry_from_row
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.election.election_hour import ElectionHour
from common.schedule.schedule_entry_types import ScheduleEntryRow
from tests.db import get_test_cursor


def test_album_on_station_methods_and_schedule_dispatch(tmp_path: Path) -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_album_sid WHERE sid = 1 AND album_exists = TRUE ORDER BY album_id LIMIT 1",
                var_type=int,
            )
            assert album_id is not None

            album = await get_album_on_station(cursor, album_id, 1)
            assert album.album_id == album_id
            assert album.get_cooldown_time() > 0

            await album.start_cooldown(cursor, cool_time_override=120)
            cool_lowest = album.data["album_cool_lowest"]
            assert cool_lowest is not None
            cooled_song_count = await cursor.fetch_var(
                """
                SELECT COUNT(*)
                FROM r4_song_sid
                JOIN r4_songs USING (song_id)
                WHERE album_id = %s AND sid = %s AND song_cool = TRUE
                """,
                (album_id, 1),
                var_type=int,
            )
            assert cooled_song_count is not None
            assert cooled_song_count > 0

            await album.update_lowest_cooldown(cursor)
            assert album.data["album_cool"] is True
            cool_lowest = album.data["album_cool_lowest"]
            assert cool_lowest is not None
            assert cool_lowest > int(timestamp())

            await album.update_last_played(cursor)
            assert (
                await cursor.fetch_var(
                    "SELECT album_played_last > 0 FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                    (album_id, 1),
                    var_type=bool,
                )
                is True
            )

            extra = await album.load_extra_detail(cursor)
            assert extra["album_rating_rank"] >= 1
            assert extra["album_rating_rank_percentile"] >= 5
            assert "3.5" in extra["album_rating_histogram"]

            for sid in await cursor.fetch_list(
                "SELECT sid FROM r4_album_sid WHERE album_id = %s",
                (album_id,),
                row_type=int,
            ):
                stations.station_id_friendly.setdefault(sid, f"Station {sid}")
            await album.update_rating(cursor)
            album_diff = album.to_album_diff()
            assert album_diff.get("id") == album_id

            await album.update_newest_song_time(cursor, album_id, 1)
            assert (
                await cursor.fetch_var(
                    "SELECT album_newest_song_time > 0 FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                    (album_id, 1),
                    var_type=bool,
                )
                is True
            )

            many = await get_many_album_on_station(cursor, [album_id], 1)
            assert [row.album_id for row in many] == [album_id]

            with pytest.raises(AlbumNotFoundError):
                await get_album_on_station(cursor, 999999, 1)

            now = int(timestamp())
            schedule_row = await create_schedule_entry(
                cursor,
                {
                    "sched_start": now + 600,
                    "sched_end": now + 780,
                    "sched_type": "OneUpProducer",
                    "sched_name": "Producer",
                    "sched_url": "/producer",
                    "sid": 1,
                    "sched_timed": True,
                    "sched_creator_user_id": 2,
                },
            )
            duplicated = await duplicate_schedule_entry(cursor, schedule_row, 3)
            assert duplicated["sched_creator_user_id"] == 3
            assert duplicated["sched_start"] == schedule_row["sched_start"]

            old_entry: ScheduleEntryRow = {**schedule_row}
            old_entry["sched_start"] = now - 1000
            old_entry["sched_end"] = now - 900
            delayed = await duplicate_schedule_entry(cursor, old_entry, 4)
            assert delayed["sched_creator_user_id"] == 4
            assert delayed["sched_end"] is None
            delayed_start = delayed["sched_start"]
            assert delayed_start is not None
            assert delayed_start >= now + 86400

            assert isinstance(get_schedule_entry_from_row(schedule_row), PowerHour)

            pvp_schedule = await create_schedule_entry(
                cursor,
                {
                    "sched_start": now - 10,
                    "sched_end": now + 180,
                    "sched_type": "PVPElection",
                    "sched_name": "PVP",
                    "sched_url": "/pvp",
                    "sid": 1,
                    "sched_timed": True,
                    "sched_creator_user_id": 2,
                },
            )
            assert isinstance(get_schedule_entry_from_row(pvp_schedule), ElectionHour)

            with pytest.raises(Exception):
                get_schedule_entry_from_row(
                    cast(
                        ScheduleEntryRow,
                        {
                        **schedule_row,
                        "sched_type": "Nope",
                        },
                    )
                )

    asyncio.run(_run())


def test_disable_song_with_fixture_song_removes_requests(tmp_path: Path) -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            fixture_source = Path(
                "src/tests/fixtures/song_file/fixture_song.mp3"
            ).resolve()
            working_copy = tmp_path / "disable_fixture_song.mp3"
            shutil.copy2(fixture_source, working_copy)

            song_file = await SongFile.create(cursor, str(working_copy))
            await song_file.upsert(cursor, [1], 1)
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_filename = %s",
                (str(working_copy),),
                var_type=int,
            )
            assert song_id is not None

            await cursor.update(
                "INSERT INTO phpbb_users (user_id, username) VALUES (%s, %s)",
                (9401, "Disable Song User"),
            )
            await cursor.update(
                "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                (9401, song_id, 1),
            )

            await disable_song(cursor, song_id)

            assert (
                await cursor.fetch_var(
                    "SELECT song_verified FROM r4_songs WHERE song_id = %s",
                    (song_id,),
                    var_type=bool,
                )
                is False
            )
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_store WHERE song_id = %s",
                    (song_id,),
                    var_type=int,
                )
                == 0
            )
            assert (
                await cursor.fetch_var(
                    "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                    (song_id, 1),
                    var_type=bool,
                )
                is False
            )

    asyncio.run(_run())
