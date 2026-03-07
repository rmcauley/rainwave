from time import time as timestamp

from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handle_url import handle_api_html_url
from api.handler_classes.api_handler import APIHandler
from api.routes.admin.power_hours.power_hours import get_ph_formatted_time
from common import stations

from common.db.cursor import get_cursor


@handle_api_url("power_hours")
class ListPowerHours(APIHandler):
    return_name = "power_hours"

    async def post(self):
        async with get_cursor() as cursor:
            self.response["power_hours"] = await cursor.fetch_all(
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
                row_type=rainwave_typeddicts.PowerHour,
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
class ListPowerHoursHTML(ListPowerHours):
    pretty_print_html = True

    def header_special(self):
        self.write("<th>Station</th>")
        self.write("<th>Date and Time</th>")

    def row_special(self, row: rainwave_typeddicts.PowerHour):
        station_friendly = (stations.station_id_friendly[row["sid"]],)
        self.write(f"<td>{station_friendly}</td>")
        self.write("<td><ul>")
        for tz in SHOW_TIMEZONES:
            self.write(
                "<div style='font-family: monospace;'>%s</div>"
                % get_ph_formatted_time(row["start"], row["end"], tz)
            )
        self.write("</ul></td>")
