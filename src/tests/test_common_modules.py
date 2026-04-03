from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from time import time as timestamp

from psycopg import sql
from contextlib import asynccontextmanager

from common.cache import cache
from common.cache.station_cache import cache_get_station, cache_set_station
from common.cache.update_user_rating_acl import (
    get_user_rating_acl,
    update_user_rating_acl,
)
from common.db.build_insert import (
    build_insert,
    build_insert_on_conflict_do_update,
    build_update,
)
from common.db.cursor import RainwaveCursor
from common.libs.pretty_date import pretty_date
from common.requests.get_request_line import get_request_line
from common.requests.request_expiry_times import (
    get_request_expire_times,
    update_request_expire_times,
)
from common.requests.request_sequencing import (
    ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY,
    NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY,
    elections_since_last_request,
    get_next_request_and_mark_as_fulfilled_if_needed,
    get_next_request_ignoring_sequencing,
    number_of_elections_to_fulfill_requests,
)
from common.requests.update_request_line import write_updated_request_line_to_db
from tests.db import get_test_cursor

TEMP_USER_BASE = 9000


@asynccontextmanager
async def _ensure_cache_connection():
    if cache.client is not None:
        yield
        return
    async with cache.cache_connect():
        yield


async def _cleanup_temp_users(cursor: RainwaveCursor) -> None:
    await cursor.update(
        "DELETE FROM r4_request_history WHERE user_id >= %s", (TEMP_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_request_store WHERE user_id >= %s", (TEMP_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_request_line WHERE user_id >= %s", (TEMP_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM r4_listeners WHERE user_id >= %s", (TEMP_USER_BASE,)
    )
    await cursor.update(
        "DELETE FROM phpbb_users WHERE user_id >= %s", (TEMP_USER_BASE,)
    )


async def _ensure_temp_user(
    cursor: RainwaveCursor, user_id: int, username: str
) -> None:
    await cursor.update(
        "INSERT INTO phpbb_users (user_id, username) VALUES (%s, %s) "
        + "ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username",
        (user_id, username),
    )


async def _seed_request_line_scenario() -> tuple[int, int, int, int, int, int]:
    async with get_test_cursor() as cursor:
        await _cleanup_temp_users(cursor)
        song_id = await cursor.fetch_var(
            "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 1",
            var_type=int,
        )
        assert song_id is not None
        await cursor.update(
            "UPDATE r4_song_sid SET song_exists = TRUE, song_cool = FALSE, "
            + "song_elec_blocked = FALSE WHERE sid = 1 AND song_id = %s",
            (song_id,),
        )

        now = int(timestamp())
        user_valid = TEMP_USER_BASE + 1
        user_countdown = TEMP_USER_BASE + 2
        user_requeue = TEMP_USER_BASE + 3
        user_tuned_out = TEMP_USER_BASE + 4
        user_expired = TEMP_USER_BASE + 5

        for user_id in [
            user_valid,
            user_countdown,
            user_requeue,
            user_tuned_out,
            user_expired,
        ]:
            await _ensure_temp_user(cursor, user_id, f"User {user_id}")

        for listener_user in [user_valid, user_countdown, user_requeue]:
            await cursor.update(
                "INSERT INTO r4_listeners (user_id, sid, listener_icecast_id) "
                + "VALUES (%s, %s, %s)",
                (listener_user, 1, listener_user),
            )

        await cursor.update(
            "INSERT INTO r4_request_store (user_id, song_id, sid, reqstor_order) "
            + "VALUES (%s, %s, 1, 1)",
            (user_valid, song_id),
        )

        await cursor.update(
            "INSERT INTO r4_request_line (user_id, sid, line_wait_start, "
            + "line_has_had_valid) VALUES (%s, 1, %s, FALSE)",
            (user_valid, now - 100),
        )
        await cursor.update(
            "INSERT INTO r4_request_line (user_id, sid, line_wait_start, "
            + "line_has_had_valid) VALUES (%s, 1, %s, FALSE)",
            (user_countdown, now - 99),
        )
        await cursor.update(
            "INSERT INTO r4_request_line "
            + "(user_id, sid, line_wait_start, line_expiry_election, "
            + "line_has_had_valid) VALUES (%s, 1, %s, %s, FALSE)",
            (user_requeue, now - 98, now - 5),
        )
        await cursor.update(
            "INSERT INTO r4_request_line (user_id, sid, line_wait_start, "
            + "line_has_had_valid) VALUES (%s, 1, %s, FALSE)",
            (user_tuned_out, now - 97),
        )
        await cursor.update(
            "INSERT INTO r4_request_line "
            + "(user_id, sid, line_wait_start, line_expiry_tune_in, "
            + "line_has_had_valid) VALUES (%s, 1, %s, %s, FALSE)",
            (user_expired, now - 96, now - 10),
        )

        return (
            song_id,
            user_valid,
            user_countdown,
            user_requeue,
            user_tuned_out,
            user_expired,
        )


async def _read_request_line_user_ids() -> list[int]:
    async with get_test_cursor() as cursor:
        return await cursor.fetch_list(
            "SELECT user_id FROM r4_request_line WHERE user_id >= %s "
            + "ORDER BY line_wait_start, user_id",
            (TEMP_USER_BASE,),
            row_type=int,
        )


def test_pretty_date_branches() -> None:
    now = datetime.now()
    assert pretty_date(None) == "just now"
    assert pretty_date(now + timedelta(seconds=5)) == ""
    assert pretty_date(now - timedelta(seconds=5)) == "just now"
    assert pretty_date(now - timedelta(seconds=40)) == "40 seconds ago"
    assert pretty_date(now - timedelta(seconds=90)) == "a minute ago"
    assert pretty_date(now - timedelta(minutes=5)) == "5 minutes ago"
    assert pretty_date(now - timedelta(hours=1, minutes=5)) == "an hour ago"
    assert pretty_date(now - timedelta(hours=5)) == "5 hours ago"
    assert pretty_date(now - timedelta(days=1)) == "Yesterday"
    assert pretty_date(now - timedelta(days=5)) == "5 days ago"
    assert pretty_date(now - timedelta(days=21)) == "3 weeks ago"
    assert pretty_date(now - timedelta(days=70)) == "2 months ago"
    assert pretty_date(now - timedelta(days=800)) == "2 years ago"


def test_build_insert_update_helpers_execute() -> None:
    async def _run() -> None:
        async with get_test_cursor() as cursor:
            await cursor.update(
                "CREATE TEMP TABLE temp_build_helper (id INTEGER PRIMARY KEY, value TEXT)"
            )
            insert_values = {"id": 1, "value": "alpha"}
            await cursor.update(
                build_insert("temp_build_helper", insert_values), insert_values
            )
            inserted_value = await cursor.fetch_var(
                "SELECT value FROM temp_build_helper WHERE id = 1",
                var_type=str,
            )
            assert inserted_value == "alpha"

            upsert_values = {"id": 1, "value": "beta"}
            await cursor.update(
                build_insert_on_conflict_do_update(
                    "temp_build_helper",
                    upsert_values,
                    conflict_clause=sql.SQL("(id)"),
                ),
                upsert_values,
            )
            updated = await cursor.fetch_var(
                "SELECT value FROM temp_build_helper WHERE id = 1",
                var_type=str,
            )
            assert updated == "beta"

            final_values = {"value": "gamma"}
            await cursor.update(
                build_update(
                    "temp_build_helper",
                    final_values,
                    where=sql.SQL("id = 1"),
                ),
                final_values,
            )
            final = await cursor.fetch_var(
                "SELECT value FROM temp_build_helper WHERE id = 1",
                var_type=str,
            )
            assert final == "gamma"

    asyncio.run(_run())


def test_request_line_and_write_back_flow() -> None:
    async def _run() -> None:
        async with _ensure_cache_connection():
            (
                song_id,
                user_valid,
                user_countdown,
                user_requeue,
                user_tuned_out,
                user_expired,
            ) = await _seed_request_line_scenario()

            async with get_test_cursor() as cursor:
                line = await get_request_line(cursor, 1)
                temp_entries = [
                    entry for entry in line if entry["user_id"] >= TEMP_USER_BASE
                ]
                assert [entry["user_id"] for entry in temp_entries] == [
                    user_valid,
                    user_countdown,
                    user_requeue,
                    user_tuned_out,
                    user_expired,
                ]

                valid_entry = temp_entries[0]
                assert valid_entry["song"] is not None
                assert valid_entry["song"]["id"] == song_id
                assert valid_entry["actions_to_take"] == {
                    "set_request_line_entry_has_had_valid_true"
                }
                assert valid_entry["skip"] is False

                countdown_entry = temp_entries[1]
                assert countdown_entry["song"] is None
                assert (
                    "update_request_line_expiry_election"
                    in countdown_entry["actions_to_take"]
                )
                assert countdown_entry["line_expiry_election"] is not None
                assert countdown_entry["skip"] is False

                requeue_entry = temp_entries[2]
                assert requeue_entry["song"] is None
                assert requeue_entry["actions_to_take"] == {"put_to_back_of_line"}
                assert requeue_entry["skip"] is True

                tuned_out_entry = temp_entries[3]
                assert tuned_out_entry["actions_to_take"] == {
                    "update_request_line_entry_expiry_tune_in"
                }
                assert tuned_out_entry["skip"] is False

                expired_entry = temp_entries[4]
                assert expired_entry["actions_to_take"] == {"remove"}
                assert expired_entry["skip"] is True

                valid_entry["actions_to_take"].add("fulfill")
                await write_updated_request_line_to_db(cursor, 1, temp_entries)

            request_line_cache = await cache_get_station(1, "request_line")
            request_positions = await cache_get_station(1, "request_user_positions")
            assert request_line_cache is not None
            assert request_positions[user_valid] == 1
            assert request_positions[user_expired] == 5

            user_ids_after = await _read_request_line_user_ids()
            assert user_expired not in user_ids_after
            assert user_requeue in user_ids_after
            assert user_valid in user_ids_after

            async with get_test_cursor() as cursor:
                history_count = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_history WHERE user_id = %s AND song_id = %s",
                    (user_valid, song_id),
                    var_type=int,
                )
                assert history_count == 1

                had_valid = await cursor.fetch_var(
                    "SELECT line_has_had_valid FROM r4_request_line WHERE user_id = %s",
                    (user_valid,),
                    var_type=bool,
                )
                assert had_valid is True

                countdown_expiry = await cursor.fetch_var(
                    "SELECT line_expiry_election FROM r4_request_line WHERE user_id = %s",
                    (user_countdown,),
                    var_type=int,
                )
                assert countdown_expiry is not None

                tuned_out_expiry = await cursor.fetch_var(
                    "SELECT line_expiry_tune_in FROM r4_request_line WHERE user_id = %s",
                    (user_tuned_out,),
                    var_type=int,
                )
                assert tuned_out_expiry is None

                request_store_count = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s AND song_id = %s",
                    (user_valid, song_id),
                    var_type=int,
                )
                assert request_store_count == 0

                await _cleanup_temp_users(cursor)

    asyncio.run(_run())


def test_request_expiry_times_and_sequencing_and_acl() -> None:
    async def _run() -> None:
        async with _ensure_cache_connection():
            async with get_test_cursor() as cursor:
                await _cleanup_temp_users(cursor)
                song_ids = await cursor.fetch_list(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 6",
                    row_type=int,
                )
                assert len(song_ids) == 6
                for song_id in song_ids:
                    await cursor.update(
                        "UPDATE r4_song_sid SET song_exists = TRUE, song_cool = FALSE, "
                        + "song_elec_blocked = FALSE WHERE sid = 1 AND song_id = %s",
                        (song_id,),
                    )
                now = int(timestamp())
                users = [TEMP_USER_BASE + idx for idx in range(20, 27)]
                for user_id in users:
                    await _ensure_temp_user(cursor, user_id, f"Seq {user_id}")
                    await cursor.update(
                        "INSERT INTO r4_listeners (user_id, sid, listener_icecast_id) "
                        + "VALUES (%s, 1, %s)",
                        (user_id, user_id),
                    )

                expiry_rows = [
                    (users[0], None, None),
                    (users[1], now + 100, None),
                    (users[2], None, now + 90),
                    (users[3], now + 200, now + 80),
                    (users[4], now + 70, now + 300),
                ]
                for offset, (user_id, tune_in, election) in enumerate(expiry_rows):
                    await cursor.update(
                        "INSERT INTO r4_request_line "
                        + "(user_id, sid, line_wait_start, line_expiry_tune_in, "
                        + "line_expiry_election) VALUES (%s, 1, %s, %s, %s)",
                        (user_id, now + offset, tune_in, election),
                    )

                for order, user_id in enumerate(users[:5], start=1):
                    await cursor.update(
                        "INSERT INTO r4_request_store (user_id, song_id, sid, "
                        + "reqstor_order) VALUES (%s, %s, 1, %s)",
                        (user_id, song_ids[order - 1], order),
                    )

                await update_request_expire_times(cursor)
                expiry_times = await get_request_expire_times()
                assert expiry_times[users[0]] is None
                assert expiry_times[users[1]] == expiry_rows[1][1]
                assert expiry_times[users[2]] == expiry_rows[2][2]
                assert expiry_times[users[3]] == expiry_rows[3][2]
                assert expiry_times[users[4]] == expiry_rows[4][1]

                elections_since_last_request.clear()
                number_of_elections_to_fulfill_requests.clear()
                await cache_set_station(1, ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY, None)
                await cache_set_station(
                    1,
                    NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY,
                    None,
                )

                line = await get_request_line(cursor, 1)
                temp_line = [entry for entry in line if entry["user_id"] in users[:5]]
                assert (
                    await get_next_request_and_mark_as_fulfilled_if_needed(1, temp_line)
                    is None
                )
                assert elections_since_last_request[1] == 1

                next_request = await get_next_request_and_mark_as_fulfilled_if_needed(
                    1, temp_line
                )
                assert next_request is not None
                assert next_request[0]["user_id"] == users[0]
                assert number_of_elections_to_fulfill_requests[1] == 1
                assert elections_since_last_request[1] == 0

                next_again = await get_next_request_ignoring_sequencing(1, temp_line)
                assert next_again is not None
                assert number_of_elections_to_fulfill_requests[1] == 0

                await cache_set_station(1, "user_rating_acl", {})
                await cache_set_station(1, "user_rating_acl_song_index", [])
                for song_id in song_ids:
                    await update_user_rating_acl(cursor, 1, song_id)
                user_rating_acl = await get_user_rating_acl(1)
                song_index = await cache_get_station(1, "user_rating_acl_song_index")
                assert song_index == song_ids[-6:]
                assert song_ids[-1] in user_rating_acl
                assert users[0] in user_rating_acl[song_ids[-1]]

                await _cleanup_temp_users(cursor)

    asyncio.run(_run())
