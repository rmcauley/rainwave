import asyncio

from common.cache import cache
from common.cache.station_cache import cache_get_station, cache_set_station
from common.db import connection as db_connection
from common.db.connection import db_connect
from common.db.cursor import get_cursor, get_tx_cursor
from common.playlist.cooldown_config import cooldown_config, prepare_cooldown_algorithm
from common.playlist.object_counts import update_playlist_object_counts
from common.requests import request_sequencing
from common.schedule.advance_timeline import (
    advance_timeline,
    format_song_for_liquidsoap,
    process_timeline_advance,
)
from common.schedule.timeline import load_timeline
from common.schedule.timelines import timeline_on_stations
from common.schedule.timeline_types import TimelineOnStation

SOURCE_SID = 1
TEST_SID = 2


async def _reset_station_two_from_station_one() -> None:
    timeline_on_stations.pop(TEST_SID, None)
    async with get_cursor() as cursor:
        await cursor.update(
            """
            DELETE FROM r4_election_entries
            WHERE elec_id IN (SELECT elec_id FROM r4_elections WHERE sid = %s)
            """,
            (TEST_SID,),
        )
        for table in (
            "r4_elections",
            "r4_schedule",
            "r4_song_history",
            "r4_song_sid",
            "r4_album_sid",
            "r4_group_sid",
        ):
            await cursor.update(f"DELETE FROM {table} WHERE sid = %s", (TEST_SID,))

        await cursor.update(
            """
            INSERT INTO r4_group_sid (group_id, sid, group_display)
            SELECT group_id, %s, group_display
            FROM r4_group_sid
            WHERE sid = %s
            """,
            (TEST_SID, SOURCE_SID),
        )
        await cursor.update(
            """
            INSERT INTO r4_album_sid (
                album_id,
                sid,
                album_song_count,
                album_newest_song_time,
                album_art_url
            )
            SELECT
                album_id,
                %s,
                album_song_count,
                album_newest_song_time,
                album_art_url
            FROM r4_album_sid
            WHERE sid = %s
            """,
            (TEST_SID, SOURCE_SID),
        )
        await cursor.update(
            """
            INSERT INTO r4_song_sid (
                song_id,
                sid
            )
            SELECT
                song_id,
                %s
            FROM r4_song_sid
            WHERE sid = %s
            """,
            (TEST_SID, SOURCE_SID),
        )


async def _prepare_station_two_for_advance() -> None:
    await _reset_station_two_from_station_one()

    cooldown_config.pop(TEST_SID, None)
    request_sequencing.elections_since_last_request.pop(TEST_SID, None)
    request_sequencing.number_of_elections_to_fulfill_requests.pop(TEST_SID, None)

    await cache_set_station(
        TEST_SID, request_sequencing.ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY, 0
    )
    await cache_set_station(
        TEST_SID,
        request_sequencing.NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY,
        0,
    )

    await update_playlist_object_counts()

    async with get_cursor() as cursor:
        await prepare_cooldown_algorithm(cursor, TEST_SID)
        await load_timeline(cursor, TEST_SID)


async def _advance_timeline_for_test(sid: int) -> str:
    async with get_tx_cursor() as cursor:
        next_song = await advance_timeline(cursor, sid)
    return format_song_for_liquidsoap(next_song)


async def _process_timeline_advance_for_test(sid: int) -> None:
    async with get_tx_cursor() as cursor:
        await process_timeline_advance(cursor, sid)


async def _verify_advance_timeline_progression() -> None:
    if db_connection.db_pool is not None:
        await db_connection.db_pool.close()
        db_connection.db_pool = None
    if cache.client is not None:
        await cache.client.close()
        cache.client = None

    async with db_connect(auto_retry=False), cache.cache_connect():
        await _prepare_station_two_for_advance()

        result = await _advance_timeline_for_test(TEST_SID)

        timeline = timeline_on_stations[TEST_SID]
        assert isinstance(timeline, TimelineOnStation)
        assert timeline.current is not None
        assert not timeline.history

        first_entry_id = getattr(timeline.current, "id")
        first_song = timeline.current.get_song_on_station_to_play()
        assert (
            result
            == f'annotate:crossfade="1",replay_gain="{first_song.data["song_replay_gain"]}":{first_song.filename}'
        )

        await _process_timeline_advance_for_test(TEST_SID)

        bootstrapped_timeline = await cache_get_station(TEST_SID, "timeline")
        assert isinstance(bootstrapped_timeline, TimelineOnStation)
        assert bootstrapped_timeline.current is not None
        assert getattr(bootstrapped_timeline.current, "id") == first_entry_id
        assert not bootstrapped_timeline.history
        assert len(bootstrapped_timeline.upnext) >= 1

        second_result = await _advance_timeline_for_test(TEST_SID)
        advanced_timeline = timeline_on_stations[TEST_SID]
        assert advanced_timeline.current is not None
        second_entry_id = getattr(advanced_timeline.current, "id")
        second_song = advanced_timeline.current.get_song_on_station_to_play()
        assert second_entry_id != first_entry_id
        assert (
            second_result
            == f'annotate:crossfade="1",replay_gain="{second_song.data["song_replay_gain"]}":{second_song.filename}'
        )
        assert (
            advanced_timeline.history[0].get_song_on_station_to_play().id
            == first_song.id
        )

        await _process_timeline_advance_for_test(TEST_SID)

        progressed_timeline = await cache_get_station(TEST_SID, "timeline")
        assert isinstance(progressed_timeline, TimelineOnStation)
        assert progressed_timeline.current is not None
        assert (
            progressed_timeline.history[0].get_song_on_station_to_play().id
            == first_song.id
        )
        assert getattr(progressed_timeline.current, "id") == second_entry_id
        assert (
            progressed_timeline.current.get_song_on_station_to_play().id
            == second_song.id
        )
        assert len(progressed_timeline.upnext) >= 1

        async with get_cursor() as cursor:
            history_ids = await cursor.fetch_list(
                """
                SELECT song_id
                FROM r4_song_history
                WHERE sid = %s
                ORDER BY songhist_id DESC
                LIMIT 1
                """,
                (TEST_SID,),
                row_type=int,
            )
        assert history_ids == [first_song.id]


async def _verify_phase_one_recovery_from_database() -> None:
    if db_connection.db_pool is not None:
        await db_connection.db_pool.close()
        db_connection.db_pool = None
    if cache.client is not None:
        await cache.client.close()
        cache.client = None

    async with db_connect(auto_retry=False), cache.cache_connect():
        await _prepare_station_two_for_advance()

        await _advance_timeline_for_test(TEST_SID)
        first_timeline = timeline_on_stations[TEST_SID]
        assert first_timeline.current is not None
        first_entry_id = getattr(first_timeline.current, "id")
        first_song_id = first_timeline.current.get_song_on_station_to_play().id

        timeline_on_stations.pop(TEST_SID, None)

        await _advance_timeline_for_test(TEST_SID)
        recovered_timeline = timeline_on_stations[TEST_SID]
        assert recovered_timeline.current is not None
        assert getattr(recovered_timeline.current, "id") != first_entry_id
        assert recovered_timeline.history
        assert getattr(recovered_timeline.history[0], "id") == first_entry_id

        await _process_timeline_advance_for_test(TEST_SID)

        async with get_cursor() as cursor:
            history_ids = await cursor.fetch_list(
                """
                SELECT song_id
                FROM r4_song_history
                WHERE sid = %s
                ORDER BY songhist_id DESC
                LIMIT 1
                """,
                (TEST_SID,),
                row_type=int,
            )
        assert history_ids == [first_song_id]


def test_advance_timeline_progression() -> None:
    asyncio.run(_verify_advance_timeline_progression())


def test_advance_timeline_recovers_from_phase_one_only_state() -> None:
    asyncio.run(_verify_phase_one_recovery_from_database())
