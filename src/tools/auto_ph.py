import asyncio
import math
from datetime import datetime, timedelta
from typing import TypedDict
from pytz import timezone

from common import log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import RainwaveCursor, get_tx_cursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.power_hours.power_hour import PowerHour

TARGET_LENGTH = 120 * 60
MIN_LENGTH = 20 * 60

# For scheduling reasoning see auto_pvp.py.
# Auto PHs run on Mon, Tue, Wed, and Thurs.
# These weekdays are `datetime.weekday` 0-index.
ALLOWED_DAYS_OF_WEEK = (0, 1, 2, 3)


class SongsTodayRow(TypedDict):
    song_id: int
    song_length: int


async def get_furthest_future_new_music_power_hour_start(
    cursor: RainwaveCursor,
) -> int | None:
    return await cursor.fetch_var(
        """
        SELECT sched_start
        FROM r4_schedule
        WHERE sched_is_auto_ph = FALSE AND sched_used = FALSE
        ORDER BY sched_start DESC
        LIMIT 1
        """,
        var_type=int,
    )


async def get_newly_added_songs(
    cursor: RainwaveCursor, sid: int
) -> list[SongsTodayRow]:
    return await cursor.fetch_all(
        """
        SELECT
            r4_songs.song_id,
            r4_songs.song_length
        FROM r4_song_sid
        JOIN r4_songs ON (
            r4_song_sid.song_id = r4_songs.song_id
        )
        WHERE song_new_played = FALSE
            AND song_verified = TRUE
            AND sid = %s
            AND song_origin_sid != 2
        ORDER BY sid, random()
        """,
        (sid,),
        row_type=SongsTodayRow,
    )


def get_next_start(
    original_start: datetime, furthest_future_start: datetime | None
) -> datetime:
    if not furthest_future_start:
        return original_start

    next_start = original_start
    while (
        next_start < (furthest_future_start + timedelta(hours=23))
        or next_start.weekday() not in ALLOWED_DAYS_OF_WEEK
    ):
        next_start += timedelta(days=1)
    return next_start


async def make_auto_power_hours(
    cursor: RainwaveCursor,
    sid: int,
    songs_today: list[SongsTodayRow],
    total_seconds: int,
) -> None:
    number_of_ph = int(math.ceil(float(total_seconds) / float(TARGET_LENGTH)))
    length_of_each_ph = total_seconds / number_of_ph

    log.debug("auto_ph", "Total minutes    : %s" % (total_seconds / 60))
    log.debug("auto_ph", "Number of PH:    : %s" % number_of_ph)
    log.debug("auto_ph", "Length of each PH: %s" % (length_of_each_ph / 60))

    furthest_future_start_epoch = await get_furthest_future_new_music_power_hour_start(
        cursor
    )
    furthest_future_start = (
        datetime.fromtimestamp(furthest_future_start_epoch, tz=timezone("US/Pacific"))
        if furthest_future_start_epoch is not None
        else None
    )
    date_for_ph_name = datetime.now(timezone("US/Pacific")).replace(
        hour=11, minute=0, second=0, microsecond=0
    )
    ph_name = date_for_ph_name.strftime("%b %d New Music")

    for part in range(number_of_ph):
        start_na = get_next_start(
            datetime.now(timezone("US/Pacific")).replace(
                hour=11, minute=0, second=0, microsecond=0
            ),
            furthest_future_start,
        )
        start_epoch_na = int(
            (
                start_na - datetime.fromtimestamp(0, timezone("US/Pacific"))
            ).total_seconds()
        )

        start_eu = get_next_start(
            datetime.now(timezone("Europe/Amsterdam")).replace(
                hour=11, minute=0, second=0, microsecond=0
            ),
            furthest_future_start,
        ) + timedelta(days=1)
        start_epoch_eu = int(
            (
                start_eu - datetime.fromtimestamp(0, timezone("Europe/Amsterdam"))
            ).total_seconds()
        )

        furthest_future_start = start_na

        name = ph_name
        if number_of_ph > 1:
            name += " (Part %s)" % (part + 1)

        schedule_entry_row_na = await create_schedule_entry(
            cursor,
            {
                "sched_creator_user_id": None,
                "sched_end": start_epoch_na + 1,
                "sched_name": name,
                "sched_start": start_epoch_na,
                "sched_timed": True,
                "sched_type": "OneUpProducer",
                "sched_url": None,
                "sid": sid,
                "sched_is_auto_ph": True,
            },
        )

        north_america_ph = PowerHour("OneUpProducer", schedule_entry_row_na)

        length = 0
        while length < length_of_each_ph and len(songs_today):
            song_row = songs_today.pop()
            await cursor.update(
                "UPDATE r4_songs SET song_new_played = TRUE WHERE song_id = %s",
                (song_row["song_id"],),
            )
            await north_america_ph.add_song_id(cursor, song_row["song_id"])
            length += song_row["song_length"]
            if length > TARGET_LENGTH:
                break

        await north_america_ph.shuffle_songs(cursor)

        all_songs = await north_america_ph.load_all_songs(cursor)

        schedule_entry_row_eu = await create_schedule_entry(
            cursor,
            {
                "sched_creator_user_id": None,
                "sched_end": start_epoch_eu + 1,
                "sched_name": name + " Reprisal",
                "sched_start": start_epoch_eu,
                "sched_timed": True,
                "sched_type": "OneUpProducer",
                "sched_url": None,
                "sid": sid,
                "sched_is_auto_ph": True,
            },
        )
        p_eu = PowerHour("OneUpProducer", schedule_entry_row_eu)
        for song in all_songs:
            await p_eu.add_song_id(cursor, song.song_on_station.id)

        length_human = "%s:%02u" % (int(math.floor(length / 60)), (length % 60))
        log.debug(
            "auto_ph",
            f"PH on {sid}, part {part}, {len(all_songs)} new songs, {length_human} length, at {start_na.isoformat(timespec="minutes")}.",
        )


async def main() -> None:
    log.init("rw_auto_ph.log")

    day_of_week = datetime.now().weekday()
    if day_of_week not in ALLOWED_DAYS_OF_WEEK:
        log.debug("auto_ph", "Not running any new music PHs today.")
        return

    async with db_connect(auto_retry=False), cache_connect(), get_tx_cursor() as cursor:
        for sid in (5, 6):
            songs_today = await get_newly_added_songs(cursor, sid)

            if len(songs_today) == 0:
                log.debug("auto_ph", f"No new songs on {sid}.")
            else:
                total_seconds = 0
                for song_row in songs_today:
                    total_seconds = total_seconds + song_row["song_length"]

                if total_seconds < MIN_LENGTH:
                    log.debug(
                        "auto_ph",
                        f"Added songs on {sid} do not add up to enough time to make a Power Hour",
                    )
                else:
                    await make_auto_power_hours(cursor, sid, songs_today, total_seconds)


if __name__ == "__main__":
    asyncio.run(main())
