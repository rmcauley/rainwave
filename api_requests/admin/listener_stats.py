from libs import db
import api.web
from api.server import handle_api_url
from api import fieldtypes

@handle_api_url("admin/listener_stats")
class ListenerStats(api.web.APIHandler):
	admin_required = True
	sid_required = False
	description = "Get listener stats for the provided date range."
	fields = {
		"date_start": (fieldtypes.date, True),
		"date_end": (fieldtypes.date, True),
		"hour_granularity": (fieldtypes.boolean, False)
	}

	def post(self):
		res = db.c.fetch_all("SELECT sid, lc_guests FROM r4_listener_counts WHERE lc_time > %s AND lc_time < %s", (self.get_argument("date_start"), self.get_argument("date_end")))
		self.append(self.return_name, res)
