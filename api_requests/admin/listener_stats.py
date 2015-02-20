import time
import datetime
from libs import db
from libs import config
import api.web
from api.server import handle_api_url
from api import fieldtypes

@handle_api_url("admin/listener_stats")
class ListenerStats(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Get listener stats for the provided date range."
	fields = {
		"date_start": (fieldtypes.date, False),
		"date_end": (fieldtypes.date, False)
	}
	return_name = "listener_stats"

	def post(self):
		self.date_start = self.get_argument("date_start") or (time.time() - (7 * 86400) + 1)
		self.date_end = self.get_argument("date_end") or time.time()
		timespan = self.date_end - self.date_start
		if timespan <= (86400 * 2):
			sql = "SELECT lc_time, lc_guests AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s"
			dateformat = "%Y-%m-%d %H:%M"
		elif timespan <= (86400 * 7):
			sql = "SELECT (lc_time - (lc_time %% 3600)) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% 3600))"
			dateformat = "%Y-%m-%d %H"
		else:
			sql = "SELECT (lc_time - (lc_time %% 86400)) AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s AND sid = %s GROUP BY (lc_time - (lc_time %% 86400))"
			dateformat = "%Y-%m-%d"
		print sql
		res = {}
		config.station_ids = (1, 2, 3, 4, 5)
		for sid in config.station_ids:
			res[sid] = db.c.fetch_all(sql, (self.date_start, self.date_end, sid))
			for row in res[sid]:
				dt = datetime.datetime.fromtimestamp(row['lc_time'])
				row['lc_time'] = dt.strftime(dateformat)
		self.append(self.return_name, res)

@handle_api_url("admin/listener_stats_by_hour")
class ListenerStatsAggregate(ListenerStats):
	description = "Get listener stats aggregated by hour, in order to see listener trends."

	def post(self):
		self.date_start = self.get_argument("date_start") or (time.time() - (7 * 86400) - 1)
		self.date_end = self.get_argument("date_end") or time.time()
		sql = ("SELECT aggr_time AS lc_time, ROUND(CAST(AVG(lc_guests) AS NUMERIC), 1) AS lc_listeners "
				"FROM ( "
					"SELECT (((lc_time %% 86400) / 3600) * 3600) + (((lc_time %% (86400 * 7)) / 86400) * 86400) AS aggr_time, lc_guests "
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
				dt = datetime.datetime.fromtimestamp(row['lc_time'])
				row['lc_time'] = dt.strftime("%a %H:%M")
		self.append(self.return_name, res)

