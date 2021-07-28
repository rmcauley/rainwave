from time import time as timestamp
import api

from api.urls import handle_api_url
from api.urls import handle_api_html_url
from api.web import PrettyPrintAPIMixin
from libs import db
from libs import config

from api_requests.admin_web.power_hours import get_ph_formatted_time


@handle_api_url("power_hours")
class ListPowerHours(api.web.APIHandler):
    return_name = "power_hours"
    admin_required = False
    sid_required = False
    auth_required = False

    def post(self):
        self.append(
            self.return_name,
            db.c.fetch_all(
                "SELECT sid, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url "
                "FROM r4_schedule "
                "WHERE sched_type = 'OneUpProducer' AND sched_start > %s ORDER BY sched_start ASC",
                (timestamp(),),
            ),
        )

SHOW_TIMEZONES = ["US/Pacific", "US/Eastern", "Europe/London", "Europe/Berlin", "Asia/Tokyo"]

@handle_api_html_url("power_hours")
class AllRequestedSongsHTML(PrettyPrintAPIMixin, ListPowerHours):
    def header_special(self):
        self.write("<th>Station</th>")
        self.write("<th>Date and Time</th>")

    def row_special(self, row):
        station_friendly = config.station_id_friendly[row['sid']],
        self.write(f"<td>{station_friendly}</td>")
        self.write("<td><ul>")
        for tz in SHOW_TIMEZONES:
          self.write(
                  "<div style='font-family: monospace;'>%s</div>"
                  % get_ph_formatted_time(
                      row["start"], row["end"], tz
                  )
              )
        self.write("</ul></td>")
