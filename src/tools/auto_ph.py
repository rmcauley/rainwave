import asyncio
import math
import sys
from datetime import datetime, timedelta
from typing import TypedDict
from pytz import timezone

from common import config, log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.power_hours.power_hour import PowerHour


TARGET_SID = 5
TARGET_LENGTH = 120 * 60
MIN_LENGTH = 20 * 60

# mon/tue/thu
ALLOWED_DAYS_OF_WEEK = [1, 2, 4]


class SongsTodayRow(TypedDict):
    song_id: int
    song_length: int


async def main() -> None:
    log_file = "%s/rw_auto_ph.log" % (config.log_dir,)
    log.init(log_file, "debug")

    await cache_connect()
    await db_connect(auto_retry=False)

    async with get_cursor() as cursor:
        songs_today = await cursor.fetch_all(
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
                AND song_origin_sid != 6
            ORDER BY random()
            """,
            (TARGET_SID,),
            row_type=SongsTodayRow,
        )

        day_of_week = datetime.now().isoweekday()
        if day_of_week not in ALLOWED_DAYS_OF_WEEK:
            log.debug("auto_ph", "Not running any new music PHs today.")
        elif len(songs_today) > 0:
            total_seconds = 0
            for song_row in songs_today:
                total_seconds = total_seconds + song_row["song_length"]

            if total_seconds < MIN_LENGTH:
                log.debug(
                    "auto_ph",
                    "Added songs do not add up to enough time to make a Power Hour",
                )
                sys.exit(0)

            number_of_ph = int(math.ceil(float(total_seconds) / float(TARGET_LENGTH)))
            length_of_each_ph = total_seconds / number_of_ph

            log.debug("auto_ph", "Total minutes    : %s" % (total_seconds / 60))
            log.debug("auto_ph", "Number of PH:    : %s" % number_of_ph)
            log.debug("auto_ph", "Length of each PH: %s" % (length_of_each_ph / 60))

            # hack - plan only one day
            number_of_ph = 1

            original_start = start = datetime.now(timezone("US/Eastern")).replace(
                hour=14, minute=0, second=0, microsecond=0
            )

            delta_days = 0
            for _ in range(number_of_ph):
                start = datetime.now(timezone("US/Eastern")).replace(
                    hour=14, minute=0, second=0, microsecond=0
                ) + timedelta(days=delta_days)
                start_epoch = int(
                    (
                        start - datetime.fromtimestamp(0, timezone("US/Eastern"))
                    ).total_seconds()
                )

                name = original_start.strftime("%b %d New Music")
                if number_of_ph > 1:
                    name += " (Part %s)" % (delta_days + 1)

                schedule_entry_row = await create_schedule_entry(
                    cursor,
                    {
                        "sched_creator_user_id": None,
                        "sched_end": start_epoch + 1,
                        "sched_name": name,
                        "sched_start": start_epoch,
                        "sched_timed": True,
                        "sched_type": "OneUpProducer",
                        "sched_url": None,
                        "sid": TARGET_SID,
                    },
                )

                p = PowerHour("OneUpProducer", schedule_entry_row)

                length = 0
                while length < length_of_each_ph and len(songs_today):
                    song_row = songs_today.pop()
                    await cursor.update(
                        "UPDATE r4_songs SET song_new_played = TRUE WHERE song_id = %s",
                        (song_row["song_id"],),
                    )
                    await p.add_song_id(cursor, song_row["song_id"], TARGET_SID)
                    length += song_row["song_length"]
                    if length > TARGET_LENGTH:
                        break

                await p.shuffle_songs(cursor)

                all_songs = await p.load_all_songs(cursor)

                start_eu = datetime.now(timezone("Europe/London")).replace(
                    hour=10, minute=0, second=0, microsecond=0
                ) + timedelta(days=delta_days + 1)
                start_epoch_eu = int(
                    (
                        start_eu - datetime.fromtimestamp(0, timezone("US/Eastern"))
                    ).total_seconds()
                )
                schedule_entry_row_eu = await create_schedule_entry(
                    cursor,
                    {
                        "sched_creator_user_id": None,
                        "sched_end": start_epoch_eu + 1,
                        "sched_name": original_start.strftime(
                            "%b %d New Music Reprisal"
                        ),
                        "sched_start": start_epoch_eu,
                        "sched_timed": True,
                        "sched_type": "OneUpProducer",
                        "sched_url": None,
                        "sid": TARGET_SID,
                    },
                )
                p_eu = PowerHour("OneUpProducer", schedule_entry_row_eu)
                for song in all_songs:
                    await p_eu.add_song_id(cursor, song.id, TARGET_SID)

                length_human = "%s:%02u" % (int(math.floor(length / 60)), (length % 60))
                log.debug(
                    "auto_ph",
                    "PH %s, %s new songs, %s length, %s day(s) in the future."
                    % (delta_days, len(all_songs), length_human, delta_days),
                )

                delta_days += 1
        else:
            log.debug("auto_ph", "No new songs.")


if __name__ == "__main__":
    asyncio.run(main())
