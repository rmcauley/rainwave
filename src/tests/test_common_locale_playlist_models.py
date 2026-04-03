from __future__ import annotations

import asyncio
import importlib
import shutil
from pathlib import Path
from typing import Any

import mutagen.id3 as mutagen_id3

from common import stations
from common.locale import locale as locale_module
from common.playlist.album.model.album import Album
from common.playlist.artist.artist import Artist
from common.playlist.song.model.song_file import SongFile
from common.playlist.song_group.song_group import SongGroup
from tests.db import get_test_cursor

id3: Any = mutagen_id3
TEMP_PLAYLIST_SID = 99
TEMP_ALBUM_COMPLETION_SID = 97
TEMP_ALBUM_USER_BASE = 9200


def test_locale_reload_and_get_closest_paths() -> None:
    invalid_locale_path = locale_module.LANG_DIR / "zz_99.json"
    original_translations = dict(locale_module.translations)
    try:
        invalid_locale_path.write_text(
            '{"language_name_short": ["bad"]}', encoding="utf-8"
        )
        reloaded = importlib.reload(locale_module)
        assert "zz-99" not in reloaded.translations

        english = reloaded.get_closest("en-CA")
        assert english.code == "en-CA"

        reloaded.translations["fr"] = english
        assert reloaded.get_closest("fr-FR") is english
    finally:
        if invalid_locale_path.exists():
            invalid_locale_path.unlink()
        importlib.reload(locale_module)
        locale_module.translations.clear()
        locale_module.translations.update(original_translations)


def test_playlist_models_real_stack_behavior() -> None:
    async def _run() -> None:
        original_station_ids = list(stations.station_ids)
        stations.station_ids = set(original_station_ids) | {TEMP_PLAYLIST_SID}
        try:
            async with get_test_cursor() as cursor:
                existing_album_name = await cursor.fetch_var(
                    "SELECT album_name FROM r4_albums ORDER BY album_id LIMIT 1",
                    var_type=str,
                )
                assert existing_album_name is not None
                existing_artist_name = await cursor.fetch_var(
                    "SELECT artist_name FROM r4_artists ORDER BY artist_id LIMIT 1",
                    var_type=str,
                )
                assert existing_artist_name is not None
                existing_group_name = await cursor.fetch_var(
                    "SELECT group_name FROM r4_groups ORDER BY group_id LIMIT 1",
                    var_type=str,
                )
                assert existing_group_name is not None

                existing_album = await Album.upsert(cursor, existing_album_name)
                assert existing_album.data["album_name"] == existing_album_name
                inserted_album = await Album.upsert(cursor, "Albüm Test")
                assert inserted_album.data["album_name_searchable"] == "album test"

                existing_artist = await Artist.upsert(cursor, existing_artist_name)
                assert existing_artist.data["artist_name"] == existing_artist_name
                inserted_artist = await Artist.upsert(cursor, "Ärtist Test")
                assert inserted_artist.data["artist_name_searchable"] == "artist test"

                existing_group = await SongGroup.upsert(cursor, existing_group_name)
                assert existing_group.data["group_name"] == existing_group_name
                inserted_group = await SongGroup.upsert(cursor, "Gröup Test")
                assert inserted_group.data["group_name_searchable"] == "group test"

                album_song_count_sid_1 = await existing_album.get_num_songs_for_station(
                    cursor, 1
                )
                assert album_song_count_sid_1 == 20
                assert await inserted_album.get_num_songs_for_station(cursor, 1) == 0

                album_for_insert_sid2 = await cursor.fetch_var(
                    "SELECT album_id FROM r4_albums ORDER BY album_id LIMIT 1",
                    var_type=int,
                )
                album_for_revive_sid2 = await cursor.fetch_var(
                    "SELECT album_id FROM r4_albums ORDER BY album_id LIMIT 1 OFFSET 1",
                    var_type=int,
                )
                album_for_remove_sid2 = await cursor.fetch_var(
                    "SELECT album_id FROM r4_albums ORDER BY album_id LIMIT 1 OFFSET 2",
                    var_type=int,
                )
                assert album_for_insert_sid2 is not None
                assert album_for_revive_sid2 is not None
                assert album_for_remove_sid2 is not None

                song_for_insert_sid2 = await cursor.fetch_var(
                    "SELECT song_id FROM r4_songs WHERE album_id = %s ORDER BY song_id LIMIT 1",
                    (album_for_insert_sid2,),
                    var_type=int,
                )
                song_for_revive_sid2 = await cursor.fetch_var(
                    "SELECT song_id FROM r4_songs WHERE album_id = %s ORDER BY song_id LIMIT 1",
                    (album_for_revive_sid2,),
                    var_type=int,
                )
                assert song_for_insert_sid2 is not None
                assert song_for_revive_sid2 is not None

                await cursor.update(
                    """
                    INSERT INTO r4_song_sid (song_id, sid, song_exists)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (song_id, sid) DO UPDATE SET song_exists = EXCLUDED.song_exists
                    """,
                    (song_for_insert_sid2, TEMP_PLAYLIST_SID, True),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_song_sid (song_id, sid, song_exists)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (song_id, sid) DO UPDATE SET song_exists = EXCLUDED.song_exists
                    """,
                    (song_for_revive_sid2, TEMP_PLAYLIST_SID, True),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_album_sid (album_id, sid, album_exists)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (album_id, sid) DO UPDATE SET album_exists = EXCLUDED.album_exists
                    """,
                    (album_for_revive_sid2, TEMP_PLAYLIST_SID, False),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_album_sid (album_id, sid, album_exists, album_song_count)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (album_id, sid)
                    DO UPDATE SET
                        album_exists = EXCLUDED.album_exists,
                        album_song_count = EXCLUDED.album_song_count
                    """,
                    (album_for_remove_sid2, TEMP_PLAYLIST_SID, True, 9),
                )

                inserted_sid_album = await Album.upsert(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT album_name FROM r4_albums WHERE album_id = %s",
                        (album_for_insert_sid2,),
                        var_type=str,
                    )
                    or "",
                )
                revived_sid_album = await Album.upsert(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT album_name FROM r4_albums WHERE album_id = %s",
                        (album_for_revive_sid2,),
                        var_type=str,
                    )
                    or "",
                )
                removed_sid_album = await Album.upsert(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT album_name FROM r4_albums WHERE album_id = %s",
                        (album_for_remove_sid2,),
                        var_type=str,
                    )
                    or "",
                )

                assert TEMP_PLAYLIST_SID in await inserted_sid_album.reconcile_sids(
                    cursor
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT album_song_count FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album_for_insert_sid2, TEMP_PLAYLIST_SID),
                        var_type=int,
                    )
                    == 1
                )
                await revived_sid_album.reconcile_sids(cursor)
                assert (
                    await cursor.fetch_var(
                        "SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album_for_revive_sid2, TEMP_PLAYLIST_SID),
                        var_type=bool,
                    )
                    is True
                )
                await removed_sid_album.reconcile_sids(cursor)
                assert (
                    await cursor.fetch_var(
                        "SELECT album_exists FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album_for_remove_sid2, TEMP_PLAYLIST_SID),
                        var_type=bool,
                    )
                    is False
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT album_song_count FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                        (album_for_remove_sid2, TEMP_PLAYLIST_SID),
                        var_type=int,
                    )
                    == 0
                )

                group_for_insert_sid2 = await cursor.fetch_var(
                    "SELECT group_id FROM r4_groups ORDER BY group_id LIMIT 1",
                    var_type=int,
                )
                group_for_remove_sid2 = await cursor.fetch_var(
                    "SELECT group_id FROM r4_groups ORDER BY group_id LIMIT 1 OFFSET 1",
                    var_type=int,
                )
                assert group_for_insert_sid2 is not None
                assert group_for_remove_sid2 is not None

                insert_group_song_id = await cursor.fetch_var(
                    """
                    SELECT song_id
                    FROM r4_song_group
                    WHERE group_id = %s
                    ORDER BY song_id
                    LIMIT 1
                    """,
                    (group_for_insert_sid2,),
                    var_type=int,
                )
                assert insert_group_song_id is not None
                await cursor.update(
                    "INSERT INTO r4_song_sid (song_id, sid, song_exists) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (insert_group_song_id, TEMP_PLAYLIST_SID, True),
                )
                await cursor.update(
                    """
                    DELETE FROM r4_song_sid
                    WHERE sid = %s
                        AND song_id IN (
                            SELECT song_id FROM r4_song_group WHERE group_id = %s
                        )
                    """,
                    (TEMP_PLAYLIST_SID, group_for_remove_sid2),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_group_sid (group_id, sid, group_display)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (group_id, sid) DO UPDATE SET group_display = EXCLUDED.group_display
                    """,
                    (group_for_remove_sid2, TEMP_PLAYLIST_SID, True),
                )

                insert_group = await SongGroup.upsert(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT group_name FROM r4_groups WHERE group_id = %s",
                        (group_for_insert_sid2,),
                        var_type=str,
                    )
                    or "",
                )
                remove_group = await SongGroup.upsert(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT group_name FROM r4_groups WHERE group_id = %s",
                        (group_for_remove_sid2,),
                        var_type=str,
                    )
                    or "",
                )

                await insert_group.reconcile_sids(cursor)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                        (group_for_insert_sid2, TEMP_PLAYLIST_SID),
                        var_type=int,
                    )
                    == 1
                )
                await remove_group.reconcile_sids(cursor)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_group_sid WHERE group_id = %s AND sid = %s",
                        (group_for_remove_sid2, TEMP_PLAYLIST_SID),
                        var_type=int,
                    )
                    == 0
                )

                existing_filename = await cursor.fetch_var(
                    "SELECT song_filename FROM r4_songs ORDER BY song_id LIMIT 1",
                    var_type=str,
                )
                assert existing_filename is not None
                existing_song_file = await SongFile.create(cursor, existing_filename)
                assert existing_song_file.existing_song_id is not None

                new_song_file = await SongFile.create(cursor, "/tmp/does-not-exist.mp3")
                assert new_song_file.existing_song_id is None
                await new_song_file.set_sids(cursor, [TEMP_PLAYLIST_SID])

                await existing_song_file.set_sids(cursor, [TEMP_PLAYLIST_SID])
                assert (
                    await cursor.fetch_var(
                        "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                        (existing_song_file.existing_song_id, TEMP_PLAYLIST_SID),
                        var_type=bool,
                    )
                    is True
                )
                assert (
                    await cursor.fetch_var(
                        "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = 1",
                        (existing_song_file.existing_song_id,),
                        var_type=bool,
                    )
                    is False
                )
        finally:
            stations.station_ids = set(original_station_ids)

    asyncio.run(_run())


def test_album_ratings_and_song_file_upsert_real_fixture(tmp_path: Path) -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            rated_album_name = await cursor.fetch_var(
                "SELECT album_name FROM r4_albums ORDER BY album_id LIMIT 1",
                var_type=str,
            )
            assert rated_album_name is not None
            rated_album = await Album.upsert(cursor, rated_album_name)
            rated_song_ids = await cursor.fetch_list(
                "SELECT song_id FROM r4_songs WHERE album_id = %s ORDER BY song_id",
                (rated_album.id,),
                row_type=int,
            )
            assert len(rated_song_ids) == 20

            await cursor.update(
                "DELETE FROM r4_song_ratings WHERE user_id = %s AND song_id = ANY(%s)",
                (3, rated_song_ids),
            )
            await cursor.update(
                "DELETE FROM r4_album_ratings WHERE user_id = %s AND album_id = %s",
                (3, rated_album.id),
            )

            for song_id in rated_song_ids:
                await cursor.update(
                    """
                    INSERT INTO r4_song_ratings (song_id, user_id, song_rating_user, song_fave)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (song_id, 3, 4.0, False),
                )

            await rated_album.update_all_user_ratings(cursor)
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_user
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (rated_album.id, 1, 3),
                    var_type=float,
                )
                == 4.0
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (rated_album.id, 1, 3),
                    var_type=bool,
                )
                is True
            )
            album_song_count = await cursor.fetch_var(
                "SELECT album_song_count FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (rated_album.id, 1),
                var_type=int,
            )
            assert album_song_count is not None

            await cursor.update(
                "DELETE FROM r4_song_ratings WHERE user_id = %s AND song_id = %s",
                (3, rated_song_ids[0]),
            )
            if len(rated_song_ids) - 1 >= album_song_count:
                await cursor.update(
                    "DELETE FROM r4_song_ratings WHERE user_id = %s AND song_id = %s",
                    (3, rated_song_ids[1]),
                )
            await cursor.update(
                """
                UPDATE r4_album_ratings
                SET album_rating_complete = TRUE
                WHERE album_id = %s AND sid = %s AND user_id = %s
                """,
                (rated_album.id, 1, 3),
            )
            await rated_album.reset_user_completed_flags(cursor)
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (rated_album.id, 1, 3),
                    var_type=bool,
                )
                is False
            )

            completion_song_ids = rated_song_ids[:3]
            completion_users = {
                "complete": TEMP_ALBUM_USER_BASE + 1,
                "becomes_complete": TEMP_ALBUM_USER_BASE + 2,
                "stays_incomplete": TEMP_ALBUM_USER_BASE + 3,
            }

            await cursor.update(
                "DELETE FROM r4_song_ratings WHERE user_id >= %s AND user_id < %s",
                (TEMP_ALBUM_USER_BASE, TEMP_ALBUM_USER_BASE + 100),
            )
            await cursor.update(
                "DELETE FROM r4_album_ratings WHERE user_id >= %s AND user_id < %s",
                (TEMP_ALBUM_USER_BASE, TEMP_ALBUM_USER_BASE + 100),
            )
            await cursor.update(
                "DELETE FROM phpbb_users WHERE user_id >= %s AND user_id < %s",
                (TEMP_ALBUM_USER_BASE, TEMP_ALBUM_USER_BASE + 100),
            )
            for user_id in completion_users.values():
                await cursor.update(
                    """
                    INSERT INTO phpbb_users (user_id, username)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username
                    """,
                    (user_id, f"Album User {user_id}"),
                )

            await cursor.update(
                "DELETE FROM r4_song_sid WHERE sid = %s AND song_id = ANY(%s)",
                (TEMP_ALBUM_COMPLETION_SID, completion_song_ids),
            )
            await cursor.update(
                "DELETE FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (rated_album.id, TEMP_ALBUM_COMPLETION_SID),
            )
            for song_id in completion_song_ids:
                await cursor.update(
                    """
                    INSERT INTO r4_song_sid (song_id, sid, song_exists)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (song_id, sid)
                    DO UPDATE SET song_exists = EXCLUDED.song_exists
                    """,
                    (song_id, TEMP_ALBUM_COMPLETION_SID),
                )

            for song_id in completion_song_ids:
                await cursor.update(
                    """
                    INSERT INTO r4_song_ratings (song_id, user_id, song_rating_user, song_fave)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (song_id, completion_users["complete"], 4.0, False),
                )
            for song_id in completion_song_ids[:2]:
                await cursor.update(
                    """
                    INSERT INTO r4_song_ratings (song_id, user_id, song_rating_user, song_fave)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (song_id, completion_users["becomes_complete"], 4.0, False),
                )
            await cursor.update(
                """
                INSERT INTO r4_song_ratings (song_id, user_id, song_rating_user, song_fave)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    completion_song_ids[0],
                    completion_users["stays_incomplete"],
                    4.0,
                    False,
                ),
            )

            await rated_album.reconcile_sids(cursor)
            await rated_album.update_all_user_ratings(cursor)

            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["complete"],
                    ),
                    var_type=bool,
                )
                is True
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["becomes_complete"],
                    ),
                    var_type=bool,
                )
                is False
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["stays_incomplete"],
                    ),
                    var_type=bool,
                )
                is False
            )

            await cursor.update(
                """
                UPDATE r4_song_sid
                SET song_exists = FALSE
                WHERE sid = %s AND song_id = %s
                """,
                (TEMP_ALBUM_COMPLETION_SID, completion_song_ids[2]),
            )
            await cursor.update(
                """
                UPDATE r4_album_ratings
                SET album_rating_complete = TRUE
                WHERE album_id = %s AND sid = %s AND user_id = %s
                """,
                (
                    rated_album.id,
                    TEMP_ALBUM_COMPLETION_SID,
                    completion_users["becomes_complete"],
                ),
            )
            await rated_album.reconcile_sids(cursor)
            await rated_album.reset_user_completed_flags(cursor)

            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_song_count
                    FROM r4_album_sid
                    WHERE album_id = %s AND sid = %s
                    """,
                    (rated_album.id, TEMP_ALBUM_COMPLETION_SID),
                    var_type=int,
                )
                == 2
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["complete"],
                    ),
                    var_type=bool,
                )
                is True
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["becomes_complete"],
                    ),
                    var_type=bool,
                )
                is True
            )
            assert (
                await cursor.fetch_var(
                    """
                    SELECT album_rating_complete
                    FROM r4_album_ratings
                    WHERE album_id = %s AND sid = %s AND user_id = %s
                    """,
                    (
                        rated_album.id,
                        TEMP_ALBUM_COMPLETION_SID,
                        completion_users["stays_incomplete"],
                    ),
                    var_type=bool,
                )
                is False
            )

            fixture_source = Path(
                "src/tests/fixtures/song_file/fixture_song.mp3"
            ).resolve()
            working_copy = tmp_path / "fixture_song.mp3"
            shutil.copy2(fixture_source, working_copy)

            inserted_song_file = await SongFile.create(cursor, str(working_copy))
            assert inserted_song_file.existing_song_id is None
            await inserted_song_file.upsert(cursor, [1, 2], 1)

            inserted_song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs WHERE song_filename = %s",
                (str(working_copy),),
                var_type=int,
            )
            assert inserted_song_id is not None
            inserted_title = await cursor.fetch_var(
                "SELECT song_title FROM r4_songs WHERE song_id = %s",
                (inserted_song_id,),
                var_type=str,
            )
            assert inserted_title == "Fixture Song"
            inserted_parseable = await cursor.fetch_var(
                "SELECT song_artist_parseable FROM r4_songs WHERE song_id = %s",
                (inserted_song_id,),
                var_type=str,
            )
            assert inserted_parseable is not None
            assert "Fixture Artist" in inserted_parseable
            assert "Guest Artist" in inserted_parseable
            replay_gain = await cursor.fetch_var(
                "SELECT song_replay_gain FROM r4_songs WHERE song_id = %s",
                (inserted_song_id,),
                var_type=str,
            )
            assert replay_gain is not None
            assert replay_gain.endswith(" dB")
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_song_artist WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 2
            )
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 2
            )
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_song_sid WHERE song_id = %s AND song_exists = TRUE",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 2
            )

            tags = id3.ID3(working_copy)
            tags.delall("TIT2")
            tags.delall("TALB")
            tags.delall("TPE1")
            tags.delall("TCON")
            tags.delall("COMM")
            tags.delall("WXXX")
            tags.add(id3.TIT2(encoding=3, text="Updated Song"))
            tags.add(id3.TALB(encoding=3, text="Updated Album"))
            tags.add(id3.TPE1(encoding=3, text="Updated Artist"))
            tags.add(id3.TCON(encoding=3, text="Updated Group"))
            tags.add(id3.COMM(encoding=3, lang="eng", desc="", text="Updated Comment"))
            tags.add(id3.WXXX(encoding=3, desc="", url="https://example.com/song"))
            tags.save()

            updated_song_file = await SongFile.create(cursor, str(working_copy))
            assert updated_song_file.existing_song_id == inserted_song_id
            await updated_song_file.upsert(cursor, [2], 2)

            assert (
                await cursor.fetch_var(
                    "SELECT song_title FROM r4_songs WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=str,
                )
                == "Updated Song"
            )
            assert (
                await cursor.fetch_var(
                    "SELECT song_origin_sid FROM r4_songs WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 2
            )
            assert (
                await cursor.fetch_var(
                    "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                    (inserted_song_id, 1),
                    var_type=bool,
                )
                is False
            )
            assert (
                await cursor.fetch_var(
                    "SELECT song_exists FROM r4_song_sid WHERE song_id = %s AND sid = %s",
                    (inserted_song_id, 2),
                    var_type=bool,
                )
                is True
            )
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_song_artist WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 1
            )
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_song_group WHERE song_id = %s",
                    (inserted_song_id,),
                    var_type=int,
                )
                == 1
            )
            updated_album_name = await cursor.fetch_var(
                """
                SELECT album_name
                FROM r4_albums
                JOIN r4_songs USING (album_id)
                WHERE song_id = %s
                """,
                (inserted_song_id,),
                var_type=str,
            )
            assert updated_album_name == "Updated Album"

    asyncio.run(_run())
