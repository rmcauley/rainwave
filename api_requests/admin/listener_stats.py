import time
from time import time as timestamp
import datetime
from libs import db
from libs import config
import api.web
from api.server import handle_api_url
from api import fieldtypes
from api.exceptions import APIException


@handle_api_url("admin/listener_stats")
class ListenerStats(api.web.APIHandler):
    admin_required = True
    sid_required = False
    description = "Get listener stats for the provided date range."
    fields = {
        "date_start": (fieldtypes.date, False),
        "date_end": (fieldtypes.date, False),
    }
    return_name = "listener_stats"
    date_start = time.time()
    date_end = time.time()

    def post(self):
        if self.get_argument("date_start"):
            self.date_start = time.mktime(self.get_argument("date_start").timetuple())
        else:
            self.date_start = timestamp() - (7 * 86400) + 1
        if self.get_argument("date_end"):
            self.date_end = time.mktime(self.get_argument("date_end").timetuple())
        else:
            self.date_end = timestamp()
        if self.date_start >= self.date_end:
            raise APIException(
                "invalid_argument", text="Start date cannot be after end date."
            )
        timespan = self.date_end - self.date_start
        if timespan <= (86400 * 2):
            sql = "SELECT (lc_time - (lc_time %% 3600)) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% 3600)) ORDER BY lc_time"
            dateformat = "%Y-%m-%d %H:00"
        elif timespan <= (86400 * 7):
            sql = "SELECT (lc_time - (lc_time %% (3600 * 6))) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% (3600 * 6))) ORDER BY lc_time"
            dateformat = "%Y-%m-%d %H:00"
        elif timespan <= (86400 * 30):
            sql = "SELECT (lc_time - (lc_time %% 86400)) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% 86400)) ORDER BY lc_time"
            dateformat = "%Y-%m-%d"
        else:
            sql = "SELECT (lc_time - (lc_time %% (86400 * 7))) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% (86400 * 7))) ORDER BY lc_time"
            dateformat = "%Y-%m-%d"
        res = {}
        config.station_ids = (1, 2, 3, 4, 5)
        for sid in config.station_ids:
            res[sid] = db.c.fetch_all(sql, (self.date_start, self.date_end, sid))
            for row in res[sid]:
                dt = datetime.datetime.fromtimestamp(row["lc_time"])
                row["lc_time"] = dt.strftime(dateformat)
        self.append(self.return_name, res)


@handle_api_url("admin/listener_stats_by_hour")
class ListenerStatsAggregate(ListenerStats):
    description = "Get listener stats aggregated by 4 hour chunks, in order to see listener trends."

    def post(self):
        if self.get_argument("date_start"):
            self.date_start = time.mktime(self.get_argument("date_start").timetuple())
        else:
            self.date_start = timestamp() - (7 * 86400) + 1
        if self.get_argument("date_end"):
            self.date_end = time.mktime(self.get_argument("date_end").timetuple())
        else:
            self.date_end = timestamp()
        sql = (
            "SELECT aggr_time AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners "
            "FROM ( "
            "SELECT (((lc_time %% 86400) / 14400) * 14400) + (((lc_time %% (86400 * 7)) / 86400) * 86400) AS aggr_time, lc_guests "
            "FROM r4_listener_counts "
            "WHERE lc_time > %s AND lc_time < %s AND sid = %s "
            ") AS lc_listeners "
            "GROUP BY lc_time ORDER BY lc_time "
        )
        res = {}
        config.station_ids = (1, 2, 3, 4, 5)
        for sid in config.station_ids:
            res[sid] = db.c.fetch_all(sql, (self.date_start, self.date_end, sid))
            for row in res[sid]:
                dt = datetime.datetime.fromtimestamp(row["lc_time"])
                row["lc_time"] = dt.strftime("%a %H:%M")
        self.append(self.return_name, res)
