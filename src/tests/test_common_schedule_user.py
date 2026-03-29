from __future__ import annotations

import asyncio
from time import time as timestamp
from typing import cast

import pytest

from api.exceptions import APIException
from api.helpers.user_vote_cache import get_user_vote_cache
from common.cache import cache
from common.db import connection
from common.db.connection import db_connect
from common.cache.station_cache import cache_set_station
from common.cache.user_cache import cache_set_user
from common.db.cursor import RainwaveCursor
from common.playlist.song.model.song_on_station import SongOnStation
from common.schedule.election.election import (
    Election,
    ElectionDoesNotExist,
    ElectionNotStartedYetError,
)
from common.schedule.election.election_entry import (
    ElectionEntryType,
    create_election_entry,
)
from common.schedule.election.election_hour import ElectionHour
import common.requests.request_sequencing as request_sequencing
from common.schedule.election.submit_vote import submit_vote
from common.schedule.schedule_models.timeline_entry_base import TimelineEntryAlreadyUsed
from common.schedule.get_schedule_entry_from_row import get_schedule_entry_from_row
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.schedule_entry_types import ScheduleEntryRow
from common.requests.get_request_line import get_request_line
from common.requests.get_user_request_count import get_request_count_for_any_station
from common.user.model.anonymous_user import AnonymousUser
from common.user.model.registered_user import RegisteredUser
from common.user.solve_avatar import AVATAR_PATH, DEFAULT_AVATAR, solve_avatar
from tests.db import get_test_cursor
from tests.helpers import ensure_cache_connection, mark_songs_requestable
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_LOGGED_IN_API_KEY,
    TUNED_OUT_LOGGED_IN_USER_ID,
    TUNED_OUT_DONOR_API_KEY,
    TUNED_OUT_DONOR_USER_ID,
)


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


async def _create_manual_election(cursor: RainwaveCursor, sid: int) -> Election:
    song_ids = await cursor.fetch_list(
        "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 3",
        row_type=int,
    )
    assert len(song_ids) == 3
    await mark_songs_requestable(cursor, sid, song_ids)

    election = await Election.create(
        cursor,
        {"elec_type": "Election", "sched_id": None, "sid": sid},
        sched_name="Test Election",
        sched_url="/test/election",
    )
    votes = [1, 3, 2]
    for position, song_id in enumerate(song_ids):
        song_on_station = await SongOnStation.load(cursor, song_id, sid)
        election.entries.append(
            await create_election_entry(
                cursor,
                election.id,
                song_on_station,
                position,
                ElectionEntryType.normal,
                None,
                None,
                votes[position],
            )
        )
    return election


async def _create_schedule_row(
    cursor: RainwaveCursor,
    *,
    sched_type: str,
    sid: int,
    sched_name: str = "Test Schedule",
    sched_url: str = "/schedule",
) -> ScheduleEntryRow:
    schedule_row = await cursor.fetch_row(
        """
        INSERT INTO r4_schedule (
            sched_start,
            sched_end,
            sched_type,
            sched_name,
            sched_url,
            sid,
            sched_timed,
            sched_creator_user_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            int(timestamp()) - 60,
            int(timestamp()) + 3600,
            sched_type,
            sched_name,
            sched_url,
            sid,
            True,
            SITE_ADMIN_USER_ID,
        ),
        row_type=ScheduleEntryRow,
    )
    assert schedule_row is not None
    return schedule_row


def test_submit_vote_and_registered_user_refresh_paths() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                await cache.cache_set("request_expire_times", {TUNED_IN_LOGGED_IN_USER_ID: 1234})
                await cache_set_station(1, "request_user_positions", {TUNED_IN_LOGGED_IN_USER_ID: 7})
                await cache_set_user(TUNED_IN_LOGGED_IN_USER_ID, "already_voted", [])
                await cache_set_user(1, "already_voted", [])

                user = await _load_registered_user(
                    cursor,
                    1,
                    TUNED_IN_LOGGED_IN_USER_ID,
                    TUNED_IN_LOGGED_IN_API_KEY,
                )
                assert user.private_data["tuned_in"] is True
                assert user.private_data["request_expires_at"] == 1234
                assert user.private_data["request_position"] == 7

                admin = await _load_registered_user(
                    cursor, 1, SITE_ADMIN_USER_ID, SITE_ADMIN_API_KEY
                )
                assert admin.private_data["admin"] is True
                assert admin.private_data["perks"] is True
                assert admin.get_max_request_slots() == 24

                donor = await _load_registered_user(
                    cursor, 1, TUNED_OUT_DONOR_USER_ID, TUNED_OUT_DONOR_API_KEY
                )
                assert donor.private_data["perks"] is True
                assert donor.get_max_request_slots() == 24

                election = await _create_manual_election(cursor, 1)
                first_entry = election.entries[0]
                second_entry = election.entries[1]

                if connection.db_pool is not None:
                    await connection.db_pool.close()
                    connection.db_pool = None

                async with db_connect(auto_retry=False):
                    result = await submit_vote(
                        user,
                        election,
                        first_entry["entry_id"],
                        first_entry["song_id"],
                        lock_count=2,
                    )
                    assert result is True

                    result = await submit_vote(
                        user,
                        election,
                        second_entry["entry_id"],
                        second_entry["song_id"],
                        lock_count=3,
                    )
                    assert result is True

                    first_votes_after_registered_change = await cursor.fetch_var(
                        "SELECT entry_votes FROM r4_election_entries WHERE entry_id = %s",
                        (first_entry["entry_id"],),
                        var_type=int,
                    )
                    assert first_votes_after_registered_change == 1

                    anonymous = await _load_anonymous_user(cursor, 1)
                    result = await submit_vote(
                        anonymous,
                        election,
                        first_entry["entry_id"],
                        first_entry["song_id"],
                        lock_count=1,
                    )
                    assert result is True

                    anonymous_repeat = await submit_vote(
                        anonymous,
                        election,
                        first_entry["entry_id"],
                        first_entry["song_id"],
                        lock_count=1,
                    )
                    assert anonymous_repeat is True

                    locked_user = await _load_registered_user(
                        cursor,
                        1,
                        TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                        TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
                    )
                    with pytest.raises(APIException, match="User locked"):
                        await submit_vote(
                            locked_user,
                            election,
                            second_entry["entry_id"],
                            second_entry["song_id"],
                            lock_count=2,
                        )

                first_votes_after = await cursor.fetch_var(
                    "SELECT entry_votes FROM r4_election_entries WHERE entry_id = %s",
                    (first_entry["entry_id"],),
                    var_type=int,
                )
                assert first_votes_after == 2

                second_votes_after = await cursor.fetch_var(
                    "SELECT entry_votes FROM r4_election_entries WHERE entry_id = %s",
                    (second_entry["entry_id"],),
                    var_type=int,
                )
                assert second_votes_after == 4

                vote_cache = await get_user_vote_cache(TUNED_IN_LOGGED_IN_USER_ID)
                assert vote_cache == [[election.id, second_entry["entry_id"]]]

                radio_inactive = await cursor.fetch_var(
                    "SELECT radio_inactive FROM phpbb_users WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                    var_type=bool,
                )
                assert radio_inactive is False

                updated_history_entry = await cursor.fetch_var(
                    "SELECT entry_id FROM r4_vote_history WHERE user_id = %s AND elec_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID, election.id),
                    var_type=int,
                )
                assert updated_history_entry == second_entry["entry_id"]

                listener_voted_entry = await cursor.fetch_var(
                    "SELECT listener_voted_entry FROM r4_listeners WHERE user_id = 1",
                    var_type=int,
                )
                assert listener_voted_entry == first_entry["entry_id"]

    asyncio.run(_run())


def test_election_power_hour_and_user_request_management() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                election = await _create_manual_election(cursor, 1)
                pre_start_length = election.length()
                assert pre_start_length > 0
                with pytest.raises(ElectionNotStartedYetError):
                    election.get_song_on_station_to_play()

                await election.start(cursor)
                playing_song = election.get_song_on_station_to_play()
                assert playing_song.id == election.entries[0]["song_id"]
                assert election.data["elec_in_progress"] is True
                assert election.length() == playing_song.data["song_length"]

                election_api = await election.to_api(cursor)
                assert election_api["type"] == "Election"
                assert len(election_api["songs"]) == 3

                await election.finish(cursor)
                assert election.data["elec_in_progress"] is False

                power_hour_row = await _create_schedule_row(
                    cursor,
                    sched_type="OneUpProducer",
                    sid=1,
                    sched_name="Power Hour",
                )
                power_hour = PowerHour(power_hour_row["sched_type"], power_hour_row)
                parsed_power_hour = get_schedule_entry_from_row(power_hour_row)
                assert isinstance(parsed_power_hour, PowerHour)

                pvp_row = await _create_schedule_row(
                    cursor,
                    sched_type="PVPElection",
                    sid=1,
                    sched_name="PVP Hour",
                )
                parsed_election_hour = get_schedule_entry_from_row(pvp_row)
                assert isinstance(parsed_election_hour, ElectionHour)

                song_ids = await cursor.fetch_list(
                    "SELECT song_id FROM r4_songs ORDER BY song_id LIMIT 4",
                    row_type=int,
                )
                assert len(song_ids) == 4
                await mark_songs_requestable(cursor, 1, song_ids)

                with pytest.raises(APIException):
                    await power_hour.add_song_id(cursor, 999999)

                await power_hour.add_song_id(cursor, song_ids[0])
                await power_hour.add_song_id(cursor, song_ids[1])
                await power_hour.add_album_id(
                    cursor,
                    await cursor.fetch_var(
                        "SELECT album_id FROM r4_songs WHERE song_id = %s",
                        (song_ids[2],),
                        var_type=int,
                    )
                    or 0,
                )

                all_songs = await power_hour.load_all_songs(cursor)
                assert len(all_songs) >= 3
                assert await power_hour.has_timeline_entries_remaining(cursor) is True

                queued = await power_hour.get_next_timeline_entry(cursor, [], None)
                assert queued is not None
                in_progress = await power_hour.get_timeline_entry_in_progress(cursor)
                assert in_progress is not None
                assert in_progress.id == queued.id

                queued_api = await queued.to_api(cursor)
                assert queued_api["type"] == "OneUp"

                await power_hour.shuffle_songs(cursor)
                await power_hour.move_song_up(cursor, queued.id)
                assert await power_hour.remove_song(cursor, queued.id) is True
                assert await power_hour.remove_song(cursor, 999999) is False

                old_start = cast(int, power_hour.data["sched_start"])
                await power_hour.change_start(cursor, old_start + 120)
                assert power_hour.data["sched_start"] == old_start + 120

                await power_hour.update_start(cursor, old_start + 240)
                await power_hour.update_end(cursor, old_start + 3600)
                await power_hour.update_as_started(cursor)
                await power_hour.update_as_finished(cursor)
                assert power_hour.data["sched_start_actual"] is not None
                assert power_hour.data["sched_end_actual"] is not None

                user = await _load_registered_user(
                    cursor,
                    1,
                    TUNED_IN_LOGGED_IN_USER_ID,
                    TUNED_IN_LOGGED_IN_API_KEY,
                )
                await cursor.update(
                    "DELETE FROM r4_request_store WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                )
                await cursor.update(
                    "DELETE FROM r4_request_line WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                )
                starting_request_count = await get_request_count_for_any_station(
                    cursor, TUNED_IN_LOGGED_IN_USER_ID
                )
                starting_remaining_slots = await user.get_remaining_request_slots(cursor)

                requestable_song = await SongOnStation.load(cursor, song_ids[0], 1)
                other_album_song = await SongOnStation.load(cursor, song_ids[1], 1)
                await user.add_request(cursor, requestable_song)

                request_count_after_add = await get_request_count_for_any_station(
                    cursor, TUNED_IN_LOGGED_IN_USER_ID
                )
                remaining_slots = await user.get_remaining_request_slots(cursor)
                assert request_count_after_add > starting_request_count
                assert (
                    remaining_slots
                    == user.get_max_request_slots() - request_count_after_add
                )
                assert remaining_slots < starting_remaining_slots

                overflow_song_ids = await cursor.fetch_list(
                    """
                    SELECT song_id
                    FROM r4_songs
                    ORDER BY album_id, song_id
                    LIMIT 13
                    """,
                    row_type=int,
                )
                assert len(overflow_song_ids) == 13
                await cursor.update(
                    "DELETE FROM r4_request_store WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                )
                for overflow_song_id in overflow_song_ids[: user.get_max_request_slots()]:
                    await cursor.update(
                        "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                        (TUNED_IN_LOGGED_IN_USER_ID, overflow_song_id, 1),
                    )
                with pytest.raises(APIException) as too_many_requests_error:
                    await user.add_request(
                        cursor,
                        await SongOnStation.load(
                            cursor, overflow_song_ids[user.get_max_request_slots()], 1
                        ),
                    )
                assert too_many_requests_error.value.tl_key == "too_many_requests"
                await cursor.update(
                    "DELETE FROM r4_request_store WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                )
                await user.add_request(cursor, requestable_song)

                with pytest.raises(APIException) as same_request_error:
                    await user.add_request(cursor, requestable_song)
                assert same_request_error.value.tl_key == "same_request_exists"

                if requestable_song.data["album_id"] == other_album_song.data["album_id"]:
                    same_album_song_id = await cursor.fetch_var(
                        "SELECT song_id FROM r4_songs WHERE album_id = %s AND song_id <> %s LIMIT 1",
                        (requestable_song.data["album_id"], requestable_song.id),
                        var_type=int,
                    )
                    assert same_album_song_id is not None
                    other_album_song = await SongOnStation.load(cursor, same_album_song_id, 1)
                with pytest.raises(APIException) as same_album_error:
                    await user.add_request(cursor, other_album_song)
                assert same_album_error.value.tl_key == "same_request_album"

                assert await user.pause_requests(cursor) is True
                line_count_paused = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                    var_type=int,
                )
                assert line_count_paused == 0

                assert await user.unpause_requests(cursor, 1) is True
                line_count_unpaused = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                    (TUNED_IN_LOGGED_IN_USER_ID,),
                    var_type=int,
                )
                assert line_count_unpaused == 1

                removed = await user.remove_request(cursor, requestable_song.id)
                assert removed == 1
                with pytest.raises(APIException) as missing_request_error:
                    await user.remove_request(cursor, requestable_song.id)
                assert missing_request_error.value.tl_key == "song_not_requested"

                listen_key = await user.generate_listen_key(cursor)
                assert len(listen_key) == 10

                anonymous = await AnonymousUser.create_anonymous_user_with_api_key(
                    cursor, 1, "127.0.0.10"
                )
                assert anonymous.private_data["api_key"]
                assert anonymous.private_data["listen_key"]

    asyncio.run(_run())


def test_election_fill_and_user_bulk_request_paths() -> None:
    async def _run() -> None:
        async with ensure_cache_connection():
            async with get_test_cursor() as cursor:
                with pytest.raises(ElectionDoesNotExist):
                    await Election.load_by_id(cursor, 999999, None, None)

                with pytest.raises(APIException) as invalid_registered_auth:
                    await RegisteredUser.get_refreshed_data(
                        cursor, 1, TUNED_IN_LOGGED_IN_USER_ID, "WRONG"
                    )
                assert invalid_registered_auth.value.tl_key == "auth_failed"

                with pytest.raises(APIException) as invalid_anonymous_auth:
                    await AnonymousUser.get_refreshed_data(cursor, 1, 1, "WRONG")
                assert invalid_anonymous_auth.value.tl_key == "auth_failed"

                await cursor.update(
                    "UPDATE phpbb_users SET radio_totalratings = %s, radio_username = %s WHERE user_id = %s",
                    (1001, "Renamed User", TUNED_OUT_LOGGED_IN_USER_ID),
                )
                threshold_user = await _load_registered_user(
                    cursor,
                    1,
                    TUNED_OUT_LOGGED_IN_USER_ID,
                    TUNED_OUT_LOGGED_IN_API_KEY,
                )
                assert threshold_user.private_data["perks"] is False
                assert threshold_user.private_data["rate_anything"] is True

                await cursor.update(
                    "UPDATE phpbb_users SET radio_username = %s WHERE user_id = %s",
                    ("Refreshed Name", TUNED_OUT_LOGGED_IN_USER_ID),
                )
                await threshold_user.refresh(cursor)
                assert threshold_user.public_data["name"] == "Refreshed Name"

                request_song_ids = await cursor.fetch_list(
                    """
                    SELECT song_id
                    FROM r4_songs
                    WHERE album_id IN (
                        SELECT DISTINCT album_id FROM r4_songs ORDER BY album_id LIMIT 4
                    )
                    ORDER BY song_id
                    LIMIT 4
                    """,
                    row_type=int,
                )
                assert len(request_song_ids) == 4
                await mark_songs_requestable(cursor, 1, request_song_ids)

                for user_id in (
                    TUNED_IN_LOGGED_IN_USER_ID,
                    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                    TUNED_OUT_LOGGED_IN_USER_ID,
                ):
                    await cursor.update(
                        "DELETE FROM r4_request_store WHERE user_id = %s", (user_id,)
                    )
                    await cursor.update(
                        "DELETE FROM r4_request_line WHERE user_id = %s", (user_id,)
                    )

                primary_user = await _load_registered_user(
                    cursor,
                    1,
                    TUNED_IN_LOGGED_IN_USER_ID,
                    TUNED_IN_LOGGED_IN_API_KEY,
                )
                secondary_user = await _load_registered_user(
                    cursor,
                    1,
                    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                    TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
                )
                bulk_user = threshold_user

                request_song = await SongOnStation.load(cursor, request_song_ids[0], 1)
                second_request_song = await SongOnStation.load(
                    cursor, request_song_ids[1], 1
                )
                await primary_user.add_request(cursor, request_song)
                await secondary_user.add_request(cursor, second_request_song)

                request_sequencing.elections_since_last_request[1] = 1
                request_sequencing.number_of_elections_to_fulfill_requests[1] = 0
                request_line = await get_request_line(cursor, 1)

                filled_election = await Election.create(
                    cursor,
                    {"elec_type": "Election", "sched_id": None, "sid": 1},
                    sched_name="Filled Election",
                    sched_url="/filled",
                )
                await filled_election.fill(cursor, request_line)
                assert len(filled_election.entries) == 3
                assert filled_election.entries[0]["entry_type"] == ElectionEntryType.request

                vote_history_count = await cursor.fetch_var(
                    "SELECT COUNT(*) FROM r4_vote_history WHERE elec_id = %s",
                    (filled_election.id,),
                    var_type=int,
                )
                assert vote_history_count == 1

                loaded_election = await Election.load_by_id(
                    cursor,
                    filled_election.id,
                    "Loaded Election",
                    "/loaded",
                )
                assert len(loaded_election.entries) == 3
                await loaded_election.start(cursor)
                with pytest.raises(TimelineEntryAlreadyUsed):
                    await loaded_election.start(cursor)

                pvp_song_ids = await cursor.fetch_list(
                    """
                    SELECT song_id
                    FROM r4_songs
                    WHERE album_id IN (
                        SELECT DISTINCT album_id FROM r4_songs ORDER BY album_id LIMIT 6 OFFSET 4
                    )
                    ORDER BY song_id
                    LIMIT 2
                    """,
                    row_type=int,
                )
                assert len(pvp_song_ids) == 2
                await mark_songs_requestable(cursor, 1, pvp_song_ids)
                for user_id in (
                    TUNED_IN_LOGGED_IN_USER_ID,
                    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                ):
                    await cursor.update(
                        "DELETE FROM r4_request_store WHERE user_id = %s", (user_id,)
                    )
                    await cursor.update(
                        "DELETE FROM r4_request_line WHERE user_id = %s", (user_id,)
                    )
                await primary_user.add_request(
                    cursor, await SongOnStation.load(cursor, pvp_song_ids[0], 1)
                )
                await secondary_user.add_request(
                    cursor, await SongOnStation.load(cursor, pvp_song_ids[1], 1)
                )
                request_sequencing.elections_since_last_request[1] = 0
                request_sequencing.number_of_elections_to_fulfill_requests[1] = 0
                pvp_request_line = await get_request_line(cursor, 1)
                pvp_election = await Election.create(
                    cursor,
                    {"elec_type": "PVPElection", "sched_id": None, "sid": 1},
                    sched_name="PVP Election",
                    sched_url="/pvp",
                )
                await pvp_election.fill(cursor, pvp_request_line)
                assert len(pvp_election.entries) == 2
                assert all(
                    entry["entry_type"] == ElectionEntryType.request
                    for entry in pvp_election.entries
                )

                empty_election = await Election.create(
                    cursor,
                    {"elec_type": "Election", "sched_id": None, "sid": 1},
                    sched_name="Empty Election",
                    sched_url="/empty",
                )
                assert empty_election.length() == 0

                await cursor.update(
                    "DELETE FROM r4_request_store WHERE user_id = %s",
                    (TUNED_OUT_LOGGED_IN_USER_ID,),
                )
                await cursor.update(
                    "DELETE FROM r4_song_ratings WHERE user_id = %s",
                    (TUNED_OUT_LOGGED_IN_USER_ID,),
                )
                added_unrated = await bulk_user.add_unrated_requests(cursor, 1)
                assert added_unrated > 0
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                        (TUNED_OUT_LOGGED_IN_USER_ID,),
                        var_type=int,
                    )
                    == 1
                )

                cleared_requests = await bulk_user.clear_all_requests(cursor)
                assert cleared_requests == added_unrated

                favorite_song_ids = await cursor.fetch_list(
                    """
                    SELECT song_id
                    FROM r4_songs
                    WHERE album_id IN (
                        SELECT DISTINCT album_id FROM r4_songs ORDER BY album_id DESC LIMIT 2
                    )
                    ORDER BY song_id
                    LIMIT 2
                    """,
                    row_type=int,
                )
                assert len(favorite_song_ids) == 2
                await mark_songs_requestable(cursor, 1, favorite_song_ids)
                for song_id in favorite_song_ids:
                    await cursor.update(
                        """
                        INSERT INTO r4_song_ratings (song_id, user_id, song_rating_user, song_fave)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (song_id, TUNED_OUT_LOGGED_IN_USER_ID, 5.0, True),
                    )
                added_favorites = await bulk_user.add_favorited_requests(cursor, 1)
                assert added_favorites > 0
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s",
                        (TUNED_OUT_LOGGED_IN_USER_ID,),
                        var_type=int,
                    )
                    == added_favorites
                )

                await bulk_user.clear_all_requests(cursor)
                cooled_song_id = favorite_song_ids[0]
                await cursor.update(
                    "UPDATE r4_song_sid SET song_cool = TRUE, song_cool_end = %s WHERE sid = %s AND song_id = %s",
                    (int(timestamp()) + 3600, 1, cooled_song_id),
                )
                await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (TUNED_OUT_LOGGED_IN_USER_ID, cooled_song_id, 1),
                )
                assert await bulk_user.clear_all_requests_on_cooldown(cursor) == 1

                bulk_user.private_data["requests_paused"] = True
                await bulk_user.put_in_request_line_if_necessary(cursor, 1)
                assert (
                    await cursor.fetch_var(
                        "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                        (TUNED_OUT_LOGGED_IN_USER_ID,),
                        var_type=int,
                    )
                    == 1
                )
                await cursor.update(
                    "DELETE FROM r4_request_line WHERE user_id = %s",
                    (TUNED_OUT_LOGGED_IN_USER_ID,),
                )
                bulk_user.private_data["requests_paused"] = False
                await bulk_user.put_in_request_line_if_necessary(cursor, 1)
                line_has_had_valid = await cursor.fetch_var(
                    "SELECT line_has_had_valid FROM r4_request_line WHERE user_id = %s",
                    (TUNED_OUT_LOGGED_IN_USER_ID,),
                    var_type=bool,
                )
                assert line_has_had_valid is False

                anonymous = await _load_anonymous_user(cursor, 1)
                await cursor.update(
                    "UPDATE r4_listeners SET listener_voted_entry = %s WHERE user_id = 1",
                    (1234,),
                )
                await anonymous.refresh(cursor)
                assert anonymous.private_data["voted_entry"] == 1234
                assert await anonymous.get_remaining_request_slots(cursor) == 0
                assert await anonymous.add_unrated_requests(cursor, 1) == 0
                assert await anonymous.add_favorited_requests(cursor, 1) == 0
                assert await anonymous.remove_request(cursor, request_song.id) == 0
                assert await anonymous.clear_all_requests(cursor) == 0
                assert await anonymous.clear_all_requests_on_cooldown(cursor) == 0
                assert await anonymous.pause_requests(cursor) is False
                assert await anonymous.unpause_requests(cursor, 1) is False
                await anonymous.add_request(cursor, request_song)
                await anonymous.put_in_request_line_if_necessary(cursor, 1)

    asyncio.run(_run())


def test_solve_avatar_branches() -> None:
    assert solve_avatar("avatar.driver.upload", "abc.png") == AVATAR_PATH % "abc.png"
    assert solve_avatar("avatar.driver.remote", "https://example.com/a.png") == (
        "https://example.com/a.png"
    )
    assert solve_avatar("avatar.driver.remote", None) == DEFAULT_AVATAR
    assert solve_avatar("other", "anything") == DEFAULT_AVATAR
