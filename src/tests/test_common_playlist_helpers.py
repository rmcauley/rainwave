from __future__ import annotations

import asyncio
import shutil
from pathlib import Path

import pytest

from common import stations
from common.playlist.remove_all_locks import remove_all_locks
from common.playlist.song.get_album_for_song import get_album_for_song
from common.playlist.song.get_artists_for_song import get_artists_for_song
from common.playlist.song.get_groups_for_song import get_groups_for_song
from common.playlist.song.model.song_file import SongFile
from common.playlist.song.replaygain import get_gain_for_song
from common.playlist.song.set_song_sids import set_song_sids
from tests.db import get_test_cursor

TEMP_HELPER_SID = 98


def test_playlist_helper_queries_and_sid_reconciliation(tmp_path: Path) -> None:
    async def _run() -> None:
        original_station_ids = set(stations.station_ids)
        stations.station_ids = set(original_station_ids) | {TEMP_HELPER_SID}
        try:
            async with get_test_cursor() as cursor:
                song_id = await cursor.fetch_var(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 1",
                    var_type=int,
                )
                assert song_id is not None

                album = await get_album_for_song(cursor, song_id)
                assert album.data["album_name"]

                artists = await get_artists_for_song(cursor, song_id)
                assert artists
                assert artists[0].data["artist_name"]

                groups = await get_groups_for_song(cursor, song_id)
                assert groups
                assert groups[0].data["group_name"]

                await set_song_sids(cursor, song_id, [1, TEMP_HELPER_SID])
                assert (
                    await cursor.fetch_var(
                        "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                        (song_id, TEMP_HELPER_SID),
                        var_type=bool,
                    )
                    is True
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album.id, TEMP_HELPER_SID),
                        var_type=bool,
                    )
                    is True
                )
                if groups:
                    assert (
                        await cursor.fetch_var(
                            "SELECT COUNT(*) FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                            (groups[0].id, TEMP_HELPER_SID),
                            var_type=int,
                        )
                        == 1
                    )

                await set_song_sids(cursor, song_id, [1])
                assert (
                    await cursor.fetch_var(
                        "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                        (song_id, TEMP_HELPER_SID),
                        var_type=bool,
                    )
                    is False
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album.id, TEMP_HELPER_SID),
                        var_type=bool,
                    )
                    is False
                )
                if groups:
                    assert (
                        await cursor.fetch_var(
                            "SELECT COUNT(*) FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                            (groups[0].id, TEMP_HELPER_SID),
                            var_type=int,
                        )
                        == 0
                    )

                await cursor.update(
                    """
                    UPDATE r4_song_sid
                    SET song_elec_blocked = TRUE,
                        song_elec_blocked_num = 9,
                        song_cool = TRUE,
                        song_cool_end = 12345
                    WHERE sid = 1
                    """
                )
                await cursor.update(
                    """
                    UPDATE r4_album_sid
                    SET album_cool = TRUE,
                        album_cool_lowest = 7
                    WHERE sid = 1
                    """
                )
                await remove_all_locks(cursor, 1)
                assert (
                    await cursor.fetch_var(
                        """
                        SELECT COUNT(*)
                        FROM r4_song_sid
                        WHERE sid = 1
                            AND (
                                song_elec_blocked = TRUE
                                OR song_elec_blocked_num <> 0
                                OR song_cool = TRUE
                                OR song_cool_end <> 0
                            )
                        """,
                        var_type=int,
                    )
                    == 0
                )
                assert (
                    await cursor.fetch_var(
                        """
                        SELECT COUNT(*)
                        FROM r4_album_sid
                        WHERE sid = 1
                            AND (
                                album_cool = TRUE
                                OR album_cool_lowest <> 0
                            )
                        """,
                        var_type=int,
                    )
                    == 0
                )
        finally:
            stations.station_ids = set(original_station_ids)

    asyncio.run(_run())


def test_song_file_helpers_and_replaygain_real_fixture(tmp_path: Path) -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            fixture_source = Path(
                "src/tests/fixtures/song_file/fixture_song.mp3"
            ).resolve()
            working_copy = tmp_path / "fixture_song_helpers.mp3"
            shutil.copy2(fixture_source, working_copy)

            song_file = await SongFile.create(cursor, str(working_copy))
            await song_file.upsert(cursor, [1], 1)
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_filename = %s",
                (str(working_copy),),
                var_type=int,
            )
            assert song_id is not None

            album = await get_album_for_song(cursor, song_id)
            assert album.data["album_name"] == "Fixture Album"

            artists = await get_artists_for_song(cursor, song_id)
            assert [artist.data["artist_name"] for artist in artists] == [
                "Fixture Artist",
                "Guest Artist",
            ]

            groups = await get_groups_for_song(cursor, song_id)
            assert [group.data["group_name"] for group in groups] == [
                "Fixture Group",
                "Alt Group",
            ]

    asyncio.run(_run())

    gain = get_gain_for_song(str((tmp_path / "fixture_song_helpers.mp3").resolve()))
    assert gain.endswith(" dB")

    with pytest.raises(Exception):
        get_gain_for_song(str((tmp_path / "missing.mp3").resolve()))
