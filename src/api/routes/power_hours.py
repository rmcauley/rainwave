from time import time as timestamp
import api

from api.handle_url import handle_api_url
from api.handle_url import handle_api_html_url
import api.web
from api.handler_classes.api_handler import APIHandler
from api.web import PrettyPrintAPIMixin
from common.libs import db
from common import config

from routes.admin_web.power_hours import get_ph_formatted_time
from common.db.cursor import get_cursor


@handle_api_url("power_hours")
class ListPowerHours(APIHandler):
    return_name = "power_hours"
    admin_required = False
    sid_required = False
    auth_required = False

    async def post(self):
        async with get_cursor() as cursor:
            self.response[self.return_name] = (
                await cursor.fetch_all(
                    """
                    SELECT
                        sid,
                        sched_id AS id,
                        sched_name AS name,
                        sched_start AS start,
                        sched_end AS end,
                        sched_url AS url
                    FROM r4_schedule
                    WHERE sched_type = 'OneUpProducer'
                        AND sched_start > %s
                    ORDER BY sched_start ASC
""",
                    (timestamp(),),
                ),
            )
        self.write_rainwave_output()


SHOW_TIMEZONES = [
    "US/Pacific",
    "US/Eastern",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
]


@handle_api_html_url("power_hours")
class AllRequestedSongsHTML(PrettyPrintAPIMixin, ListPowerHours):
    def header_special(self):
        self.write("<th>Station</th>")
        self.write("<th>Date and Time</th>")

    def row_special(self, row):
        station_friendly = (config.station_id_friendly[row["sid"]],)
        self.write(f"<td>{station_friendly}</td>")
        self.write("<td><ul>")
        for tz in SHOW_TIMEZONES:
            self.write(
                "<div style='font-family: monospace;'>%s</div>"
                % get_ph_formatted_time(row["start"], row["end"], tz)
            )
        self.write("</ul></td>")
