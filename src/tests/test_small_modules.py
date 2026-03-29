from __future__ import annotations

import asyncio
import shutil
from pathlib import Path

from common import config
from common.ratings.set_album_fave import set_album_fave
from common.schedule.schedule_exceptions import (
    ScheduleEntryAlreadyUsed,
    ScheduleIsEmpty,
)
from scanner.scan_all_directories import scan_all_directories
from tests.db import get_test_cursor


def test_schedule_exceptions_can_be_raised() -> None:
    try:
        raise ScheduleEntryAlreadyUsed("used")
    except ScheduleEntryAlreadyUsed as exc:
        assert str(exc) == "used"

    try:
        raise ScheduleIsEmpty("empty")
    except ScheduleIsEmpty as exc:
        assert str(exc) == "empty"


def test_set_album_fave_upserts_real_row() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_albums ORDER BY album_id LIMIT 1",
                var_type=int,
            )
            assert album_id is not None

            await set_album_fave(cursor, album_id, 2, True)
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_fave
                    FROM r4_album_faves
                    WHERE album_id = %s AND user_id = %s
                    """,
                    (album_id, 2),
                    var_type=bool,
                )
                is True
            )

            await set_album_fave(cursor, album_id, 2, False)
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_fave
                    FROM r4_album_faves
                    WHERE album_id = %s AND user_id = %s
                    """,
                    (album_id, 2),
                    var_type=bool,
                )
                is False
            )

    asyncio.run(_run())


def test_scan_all_directories_walks_fixture_files(tmp_path: Path) -> None:
    async def _run() -> None:
        fixture_source = Path("src/tests/fixtures/song_file/fixture_song.mp3").resolve()
        music_dir = tmp_path / "music"
        music_dir.mkdir()
        working_copy = music_dir / "scan_fixture_song.mp3"
        shutil.copy2(fixture_source, working_copy)

        old_song_dirs = config.song_dirs
        config.song_dirs = {str(music_dir): [1]}
        try:
            async with get_test_cursor() as cursor:
                await scan_all_directories(cursor, art_only=False)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_songs WHERE song_filename = %s",
                        (str(working_copy),),
                        var_type=int,
                    )
                    == 1
                )

                second_copy = music_dir / "skip_me.mp3"
                shutil.copy2(fixture_source, second_copy)
                await scan_all_directories(cursor, art_only=True)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_songs WHERE song_filename = %s",
                        (str(second_copy),),
                        var_type=int,
                    )
                    == 0
                )
        finally:
            config.song_dirs = old_song_dirs

    asyncio.run(_run())
