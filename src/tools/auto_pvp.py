import asyncio
from datetime import datetime
from typing import cast
from pytz import timezone
from pytz.tzinfo import DstTzInfo

from common import config, log, stations
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.schedule_entry_types import ScheduleEntryInsertRow

### Rainwave Daily Scheduling
#
# PVPs run at 10:00 US/Pacific, 10:00 Europe/Amsterdam daily.
# Auto PHs are 11:00 US/Pacific, +1 day 11:00 Europe/Amsterdam.
# The auto scheduling achieves two goals:
#    1. North America hears new music first
#    2. Neither timezone hears the new music twice if they are tuned in for a 9am-5pm local work schedule

# These tuples are `datetime.weekday` order, 0 = Monday, with the station
# to play on at the weekday index.  e.g. (0, 2...) means OCR PVP on Tuesday.
# A 0 means skip that day for PVP Hour.
# The reasoning behind this scheduling pattern to give more attention to the
# less popular channels during the week and to not interfere with new music
# power hours on All or Chill during the weekdays.
station_for_day_of_week_america = (4, 2, 3, 4, 1, 5, 6)
station_for_day_of_week_europe = (3, 4, 2, 3, 1, 5, 6)

pvp_hour_names: dict[int, str] = {6: "Chill-Off Hour"}


def get_auto_pvp_schedule_entry(
    start_datetime: datetime, station_for_day_of_week: tuple[int, ...]
) -> ScheduleEntryInsertRow | None:
    sid = station_for_day_of_week[start_datetime.weekday()]
    if not sid:
        return None

    start_epoch = int(start_datetime.timestamp())
    return {
        "sched_creator_user_id": None,
        "sched_end": start_epoch + 3600,
        "sched_name": pvp_hour_names.get(sid, "PvP Hour"),
        "sched_start": start_epoch,
        "sched_timed": True,
        "sched_type": "PVPElection",
        "sched_url": None,
        "sid": sid,
        "sched_is_auto_ph": False,
    }


async def main() -> None:
    log_file = "%s/rw_auto_pvp.log" % (config.log_dir,)
    log.init(log_file, "debug")
    async with db_connect(auto_retry=False), cache_connect():
        timezones: list[tuple[DstTzInfo, tuple[int, ...]]] = [
            (cast(DstTzInfo, timezone("US/Pacific")), station_for_day_of_week_america),
            (
                cast(DstTzInfo, timezone("Europe/Amsterdam")),
                station_for_day_of_week_europe,
            ),
        ]

        async with get_cursor() as cursor:
            for tz, station_for_day_of_week in timezones:
                start_datetime = datetime.now(tz).replace(
                    hour=10, minute=0, second=0, microsecond=0
                )
                schedule_entry = get_auto_pvp_schedule_entry(
                    start_datetime, station_for_day_of_week
                )
                if not schedule_entry:
                    log.debug(
                        "auto_pvp",
                        f"Skipping auto PVP for weekday {start_datetime.weekday()} in {tz.zone}.",
                    )
                else:
                    await create_schedule_entry(cursor, schedule_entry)
                    sid = schedule_entry["sid"]
                    log.debug(
                        "auto_pvp",
                        "%04d/%02d/%02d %02d:%02d PVP %s %s"
                        % (
                            start_datetime.year,
                            start_datetime.month,
                            start_datetime.day,
                            start_datetime.hour,
                            start_datetime.minute,
                            stations.station_id_friendly[sid],
                            tz.__class__.__name__,
                        ),
                    )


if __name__ == "__main__":
    asyncio.run(main())
