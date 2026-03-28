import asyncio

from common.cache import cache
from common.cache.station_cache import cache_get_station, cache_set_station
from common.db import connection as db_connection
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.cooldown_config import cooldown_config, prepare_cooldown_algorithm
from common.playlist.object_counts import update_playlist_object_counts
from common.requests import request_sequencing
from common.schedule.advance_timeline import (
    advance_timeline,
    advance_timeline_post_process,
)
from common.schedule.timeline import load_timeline
from common.schedule.timeline_types import TimelineOnStation

SOURCE_SID = 1
TEST_SID = 2


async def _reset_station_two_from_station_one() -> None:
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


async def _verify_advance_timeline_progression() -> None:
    if db_connection.db_pool is not None:
        await db_connection.db_pool.close()
        db_connection.db_pool = None
    if cache.client is not None:
        await cache.client.close()
        cache.client = None

    async with db_connect(auto_retry=False), cache.cache_connect():
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

        result = await advance_timeline(TEST_SID, trigger_post_process=False)

        cached_timeline = await cache_get_station(TEST_SID, "timeline")
        assert isinstance(cached_timeline, TimelineOnStation)

        current_song_id = cached_timeline.current.get_song_on_station_to_play().id
        next_entry_id = getattr(cached_timeline.upnext[0], "id")
        next_song = cached_timeline.upnext[0].get_song_on_station_to_play()
        assert (
            result
            == f'annotate:crossfade="1",replay_gain="{next_song.data["song_replay_gain"]}":{next_song.filename}'
        )
        assert (
            cached_timeline.current.get_song_on_station_to_play().id == current_song_id
        )

        await advance_timeline_post_process(TEST_SID)

        progressed_timeline = await cache_get_station(TEST_SID, "timeline")
        assert isinstance(progressed_timeline, TimelineOnStation)
        assert (
            progressed_timeline.history[0].get_song_on_station_to_play().id
            == current_song_id
        )
        assert getattr(progressed_timeline.current, "id") == next_entry_id
        assert (
            progressed_timeline.current.get_song_on_station_to_play().id == next_song.id
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
        assert history_ids == [current_song_id]


def test_advance_timeline_progression() -> None:
    asyncio.run(_verify_advance_timeline_progression())
