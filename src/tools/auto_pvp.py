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


# First entry of this tuple is 0 index, 0 = Monday, Monday = play on All, All = 5
station_for_day_of_week_america = [5, 1, 4, 2, 3, 4, 3]
station_for_day_of_week_europe = [4, 2, 3, 5, 1, 2, 1]


async def main() -> None:
    log_file = "%s/rw_auto_pvp.log" % (config.log_dir,)
    log.init(log_file, "debug")
    async with db_connect(auto_retry=False), cache_connect():
        timezones: list[tuple[DstTzInfo, list[int]]] = [
            (cast(DstTzInfo, timezone("US/Eastern")), station_for_day_of_week_america),
            (
                cast(DstTzInfo, timezone("Europe/London")),
                station_for_day_of_week_europe,
            ),
        ]

        async with get_cursor() as cursor:
            for tz, station_for_day_of_week in timezones:
                start_datetime = datetime.now(tz).replace(
                    hour=13, minute=0, second=0, microsecond=0
                )
                sid = station_for_day_of_week[start_datetime.weekday()]
                await create_schedule_entry(
                    cursor,
                    {
                        "sched_creator_user_id": None,
                        "sched_end": int(start_datetime.timestamp() + 3600),
                        "sched_name": "PvP Hour",
                        "sched_start": int(start_datetime.timestamp()),
                        "sched_timed": True,
                        "sched_type": "PVPElection",
                        "sched_url": None,
                        "sid": sid,
                    },
                )
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
