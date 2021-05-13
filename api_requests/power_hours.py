from api.urls import handle_api_url
from api.urls import handle_api_html_url
from api.web import PrettyPrintAPIMixin

from api_requests.admin.power_hours import ListPowerHours as ListPowerHoursAdmin
from api_requests.admin_web.power_hours import get_ph_formatted_time


@handle_api_url("power_hours")
class ListPowerHours(ListPowerHoursAdmin):
    admin_required = False

SHOW_TIMEZONES = ["US/Pacific", "US/Eastern", "Europe/London", "Europe/Berlin", "Asia/Tokyo"]

@handle_api_html_url("power_hours")
class AllRequestedSongsHTML(PrettyPrintAPIMixin, ListPowerHours):
    def header_special(self):
        self.write("<th>Date and Time</th>")

    def row_special(self, row):
        self.write("<td><ul>")
        for tz in SHOW_TIMEZONES:
          self.write(
                  "<div style='font-family: monospace;'>%s</div>"
                  % get_ph_formatted_time(
                      row["start"], row["end"], tz
                  )
              )
        self.write("</ul></td>")
