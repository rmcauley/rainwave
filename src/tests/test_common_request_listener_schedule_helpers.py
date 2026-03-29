from __future__ import annotations

import asyncio
from time import time as timestamp
from typing import cast

from common.cache.station_cache import cache_set_station
from common.db.cursor import RainwaveCursor
from common.listeners.get_all_listeners import get_listeners_dict
from common.listeners.get_user_listener_record import (
    get_anonymous_listener_record,
    get_registered_listener_record,
)
from common.playlist.song.model.song_on_station import SongOnStation
from common.requests.get_request_line import get_request_line
from common.requests.put_user_to_back_of_request_line import (
    put_user_to_back_of_request_line,
)
from common.requests.request_line_types import RequestLineEntry
from common.requests.update_albums_with_requests_flag import (
    update_albums_with_requests_flag,
)
from common.requests.update_request_line_entry_has_had_valid import (
    set_request_line_entry_has_had_valid_true,
)
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.get_timeline_entry_in_progress import (
    get_timeline_entry_in_progress,
)
from common.schedule.mark_ended_schedule_entries_as_used import (
    mark_ended_schedule_entries_as_used,
)
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.power_hours.power_hour_song import PowerHourSong
from common.schedule.start_next_timeline_entry_and_get_song_to_play import (
    start_next_timeline_entry_and_get_song_to_play,
)
from common.schedule.timeline_types import TimelineOnStation
from common.user.can_user_rate_song import can_user_rate_song
from common.user.model.anonymous_user import AnonymousUser
from common.user.model.registered_user import RegisteredUser
from tests.db import get_test_cursor
from tests.helpers import ensure_cache_connection, mark_songs_requestable
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_LISTEN_KEY,
    TUNED_IN_ANONYMOUS_IP,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_DONOR_API_KEY,
    TUNED_OUT_DONOR_USER_ID,
)

TEMP_HELPER_USER_BASE = 9300
TEMP_SCHEDULE_SID = 96


async def _load_registered_user(
    cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
) -> RegisteredUser:
    public_data, private_data, server_data = await RegisteredUser.get_refreshed_data(
        cursor, sid, user_id, api_key
    )
    return RegisteredUser(public_data, private_data, server_data, "127.0.0.1")


async def _load_anonymous_user(cursor: RainwaveCursor, sid: int) -> AnonymousUser:
    public_data, private_data, server_data = await AnonymousUser.get_refreshed_data(
        cursor, sid, 1, ANONYMOUS_API_KEY
    )
    return AnonymousUser(public_data, private_data, server_data, "127.0.0.1")


async def _cleanup_temp_users(cursor: RainwaveCursor) -> None:
    await cursor.update(
        "DELETE FROM r4_request_history WHERE user_id >= %s", (TEMP_HELPER_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_request_store WHERE user_id >= %s", (TEMP_HELPER_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_request_line WHERE user_id >= %s", (TEMP_HELPER_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_listeners WHERE user_id >= %s", (TEMP_HELPER_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM phpbb_users WHERE user_id >= %s", (TEMP_HELPER_USER_BASE,)
    )


async def _ensure_temp_user(cursor: RainwaveCursor, user_id: int, username: str) -> None:
    await cursor.update(
        """
        INSERT INTO phpbb_users (user_id, username)
        VALUES (%s, %s)
        ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username
        """,
        (user_id, username),
    )


def test_listener_and_user_rating_helpers() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                listeners = await get_listeners_dict(cursor, 1)
                listener_ids = {listener["id"] for listener in listeners}
                assert 1 not in listener_ids
                assert TUNED_IN_LOGGED_IN_USER_ID in listener_ids
                assert [listener["name"] for listener in listeners] == sorted(
                    listener["name"] for listener in listeners
                )

                registered_listener = await get_registered_listener_record(
                    cursor, TUNED_IN_LOGGED_IN_USER_ID
                )
                assert registered_listener is not None
                assert registered_listener["sid"] == 1
                assert registered_listener["listen_key"] is None

                anonymous_listener = await get_anonymous_listener_record(
                    cursor, TUNED_IN_ANONYMOUS_IP
                )
                assert anonymous_listener is not None
                assert anonymous_listener["listen_key"] == ANONYMOUS_LISTEN_KEY

                low_priv_user_id = TEMP_HELPER_USER_BASE + 50
                await _ensure_temp_user(cursor, low_priv_user_id, "Low Priv User")
                await cursor.update(
                    "DELETE FROM r4_api_keys WHERE user_id = %s OR api_key = %s",
                    (low_priv_user_id, "LOWPRIV"),
                )
                await cursor.update(
                    """
                    INSERT INTO r4_api_keys (user_id, api_key)
                    VALUES (%s, %s)
                    """,
                    (low_priv_user_id, "LOWPRIV"),
                )

                low_priv_registered = await _load_registered_user(
                    cursor,
                    1,
                    low_priv_user_id,
                    "LOWPRIV",
                )
                donor = await _load_registered_user(
                    cursor, 1, TUNED_OUT_DONOR_USER_ID, TUNED_OUT_DONOR_API_KEY
                )
                anonymous = await _load_anonymous_user(cursor, 1)

                song_id = await cursor.fetch_var(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 1",
                    var_type=int,
                )
                assert song_id is not None

                assert await can_user_rate_song(anonymous, 1, song_id) is False
                assert await can_user_rate_song(donor, 1, song_id) is True
                assert await can_user_rate_song(low_priv_registered, 1, song_id) is False

                await cache_set_station(
                    1, "user_rating_acl", {song_id: [low_priv_user_id]}
                )
                assert await can_user_rate_song(low_priv_registered, 1, song_id) is True

    asyncio.run(_run())


def test_request_line_requeue_and_album_request_flags() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            await _cleanup_temp_users(cursor)

            waiting_user = TEMP_HELPER_USER_BASE + 1
            drop_user = TEMP_HELPER_USER_BASE + 2
            await _ensure_temp_user(cursor, waiting_user, "Waiting User")
            await _ensure_temp_user(cursor, drop_user, "Drop User")

            song_ids = await cursor.fetch_list(
                """
                SELECT DISTINCT ON (album_id) song_id
                FROM r4_songs
                ORDER BY album_id, song_id
                LIMIT 2
                """,
                row_type=int,
            )
            assert len(song_ids) == 2
            await mark_songs_requestable(cursor, 1, song_ids)

            for user_id, song_id in [(waiting_user, song_ids[0]), (drop_user, song_ids[1])]:
                await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid, reqstor_order) VALUES (%s, %s, %s, %s)",
                    (user_id, song_id, 1, 1),
                )

            await cursor.update(
                "INSERT INTO r4_listeners (user_id, sid, listener_icecast_id) VALUES (%s, %s, %s)",
                (waiting_user, 1, waiting_user),
            )
            await cursor.update(
                "INSERT INTO r4_request_line (user_id, sid, line_has_had_valid) VALUES (%s, %s, %s)",
                (waiting_user, 1, False),
            )
            await cursor.update(
                "INSERT INTO r4_request_line (user_id, sid, line_has_had_valid) VALUES (%s, %s, %s)",
                (drop_user, 1, False),
            )

            line = await get_request_line(cursor, 1)
            waiting_entry = next(
                entry for entry in line if entry["user_id"] == waiting_user
            )
            drop_entry = next(entry for entry in line if entry["user_id"] == drop_user)

            await set_request_line_entry_has_had_valid_true(
                cursor,
                cast(
                    RequestLineEntry,
                    {
                        "user_id": waiting_user,
                        "line_has_had_valid": True,
                    },
                ),
            )
            assert (
                await cursor.fetch_var(
                    "SELECT line_has_had_valid FROM r4_request_line WHERE user_id = %s",
                    (waiting_user,),
                    var_type=bool,
                )
                is True
            )

            await put_user_to_back_of_request_line(cursor, waiting_entry)
            assert (
                await cursor.fetch_var(
                    "SELECT sid FROM r4_request_line WHERE user_id = %s",
                    (waiting_user,),
                    var_type=int,
                )
                == 1
            )

            await put_user_to_back_of_request_line(cursor, drop_entry)
            assert (
                await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                    (drop_user,),
                    var_type=int,
                )
                == 0
            )

            album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_songs WHERE song_id = %s",
                (song_ids[0],),
                var_type=int,
            )
            other_album_id = await cursor.fetch_var(
                "SELECT album_id FROM r4_songs WHERE song_id = %s",
                (song_ids[1],),
                var_type=int,
            )
            assert album_id is not None
            assert other_album_id is not None

            await cursor.update(
                "UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE sid = %s AND album_id = %s",
                (1, other_album_id),
            )
            await update_albums_with_requests_flag(cursor, 1, [waiting_entry])
            assert (
                await cursor.fetch_var(
                    "SELECT album_requests_pending FROM r4_album_sid WHERE sid = %s AND album_id = %s",
                    (1, album_id),
                    var_type=bool,
                )
                is True
            )
            assert (
                await cursor.fetch_var(
                    "SELECT album_requests_pending FROM r4_album_sid WHERE sid = %s AND album_id = %s",
                    (1, other_album_id),
                    var_type=bool,
                )
                is None
            )

    asyncio.run(_run())


def test_schedule_helper_progression_paths() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            song_id = await cursor.fetch_var(
                "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 1",
                var_type=int,
            )
            assert song_id is not None
            await mark_songs_requestable(cursor, 1, [song_id])

            now = int(timestamp())
            ended_schedule_row = await create_schedule_entry(
                cursor,
                {
                    "sched_start": now - 120,
                    "sched_end": now - 60,
                    "sched_type": "OneUpProducer",
                    "sched_name": "Ended Power Hour",
                    "sched_url": "/ended",
                    "sid": 1,
                    "sched_timed": True,
                    "sched_creator_user_id": None,
                },
            )
            await mark_ended_schedule_entries_as_used(cursor, 1)
            assert (
                await cursor.fetch_var(
                    "SELECT sched_used FROM r4_schedule WHERE sched_id = %s",
                    (ended_schedule_row["sched_id"],),
                    var_type=bool,
                )
                is True
            )

            active_schedule_row = await create_schedule_entry(
                cursor,
                {
                    "sched_start": now - 10,
                    "sched_end": now + 600,
                    "sched_type": "OneUpProducer",
                    "sched_name": "Active Power Hour",
                    "sched_url": "/active",
                    "sid": 1,
                    "sched_timed": True,
                    "sched_creator_user_id": None,
                },
            )
            power_hour = PowerHour("OneUpProducer", active_schedule_row)
            await power_hour.add_song_id(cursor, song_id, order=0)

            in_progress = await get_timeline_entry_in_progress(cursor, 1)
            assert in_progress is not None
            queued_power_hour_song = cast(PowerHourSong, in_progress)
            song_to_play = await start_next_timeline_entry_and_get_song_to_play(
                cursor,
                TimelineOnStation(
                    [], queued_power_hour_song, [queued_power_hour_song]
                ),
            )
            assert isinstance(song_to_play, SongOnStation)
            assert song_to_play.id == song_id
            assert (
                await cursor.fetch_var(
                    "SELECT one_up_start_actual IS NOT NULL FROM r4_one_ups WHERE one_up_id = %s",
                    (queued_power_hour_song.id,),
                    var_type=bool,
                )
                is True
            )

    asyncio.run(_run())
