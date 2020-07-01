#!/usr/bin/env python

import argparse
from datetime import datetime
from pytz import timezone

from libs import config
from libs import db
from libs import cache
from libs import log

from rainwave.events import pvpelection

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave PVP Hour generation script.")
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    config.load(args.config)
    log_file = "%s/rw_auto_pvp.log" % (config.get_directory("log_dir"),)
    log.init(log_file, config.get("log_level"))
    db.connect()
    cache.connect()

    dow_map = [(4, 5), (2, 1), (3, 4), (5, 2), (1, 3), (2, 4), (1, 3)]
    # dow_map = [ (1, 1), (1, 1), (1, 1), (1, 1), (1, 1), (1, 1), (1, 1) ]
    timezones = [(timezone("Europe/London"), 13, 0), (timezone("US/Eastern"), 13, 1)]

    for tz in timezones:
        start = datetime.now(tz[0]).replace(
            hour=tz[1], minute=0, second=0, microsecond=0
        )
        sid = dow_map[start.weekday()][tz[2]]
        start_e = (
            start - datetime.fromtimestamp(0, timezone("US/Eastern"))
        ).total_seconds()
        log.debug(
            "auto_pvp",
            "%04d/%02d/%02d %02d:%02d PVP %s %s"
            % (
                start.year,
                start.month,
                start.day,
                start.hour,
                start.minute,
                config.station_id_friendly[sid],
                tz[0].__class__.__name__,
            ),
        )
        pvpelection.PVPElectionProducer.create(
            sid, start_e, start_e + 3600, name="PvP Hour"
        )
