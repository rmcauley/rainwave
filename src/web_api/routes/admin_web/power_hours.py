import datetime
import math
from pytz import timezone

from libs import log
from src.backend import config
import web_api.web
from web_api.urls import handle_url
from routes.admin_web.index import AlbumList
from routes.admin_web.index import SongList

from routes.admin import power_hours
from routes.admin_web import index


def get_ph_formatted_time(start_time: int, end_time: int, timezone_name: str) -> str:
    return "%s to %s" % (
        datetime.datetime.fromtimestamp(start_time, timezone(timezone_name)).strftime(
            "%a %b %d/%Y %H:%M"
        ),
        datetime.datetime.fromtimestamp(end_time, timezone(timezone_name)).strftime(
            "%H:%M %Z"
        ),
    )


@handle_url("/admin/tools/power_hours")
class WebListPowerHours(web_api.web.PrettyPrintAPIMixin, power_hours.ListPowerHours):
    def get(self):  # pylint: disable=E0202
        if not isinstance(self._output, dict):
            raise web_api.web.APIException("internal_error", http_code=500)

        self.write(
            self.render_string(
                "bare_header.html",
                title="%s Power Hours" % config.station_id_friendly[self.sid],
            )
        )
        self.write("<h2>%s Power Hours</h2>" % config.station_id_friendly[self.sid])
        self.write("<script>window.top.current_sched_id = null;</script>\n\n")
        self.write("<script>\nwindow.top.refresh_all_screens = false;\n</script>")

        self.write("<div>Input date and time in YOUR timezone.<br>")
        self.write("Name: <input id='new_ph_name' type='text' /><br>")
        index.write_html_time_form(self, "new_ph")
        self.write(
            "<br><button onclick=\"window.top.call_api('admin/create_producer', "
        )
        self.write(
            "{ 'producer_type': 'OneUpProducer', 'end_utc_time': document.getElementById('new_ph_timestamp').value, 'start_utc_time': document.getElementById('new_ph_timestamp').value, 'name': document.getElementById('new_ph_name').value, 'url': '' });\""
        )
        self.write(">Create new, empty Power Hour</button></div>")
        self.write("<div>(based on above form with...)<br>")
        self.write(
            "Length: <select id='unrated_length'><option value='1800'>30m</option><option value='3600' selected>1h</option><option value='5400'>1.5h</option><option value='7200'>2h</option></select>"
        )
        self.write(
            "<br><button onclick=\"window.top.call_api('admin/create_producer', "
        )
        self.write(
            "{ 'fill_unrated': true, 'producer_type': 'OneUpProducer', 'end_utc_time': parseInt(document.getElementById('new_ph_timestamp').value) + parseInt(document.getElementById('unrated_length').value), 'start_utc_time': document.getElementById('new_ph_timestamp').value, 'name': document.getElementById('new_ph_name').value, 'url': '' });\""
        )
        self.write(">Create new PH w/unrated songs</button></div><hr>")

        if (
            self.return_name in self._output
            and isinstance(self._output[self.return_name], list)
            and len(self._output[self.return_name]) > 0
        ):
            self.write("<ul>")
            for producer in self._output[self.return_name]:
                self.write(
                    "<li><div><b><a href='power_hour_detail?sid=%s&sched_id=%s'>%s</a></b></div>"
                    % (self.sid, producer["id"], producer["name"])
                )
                self.write(
                    "<div style='font-family: monospace;'>%s</div>"
                    % get_ph_formatted_time(
                        producer["start"], producer["end"], "US/Eastern"
                    )
                )
                self.write(
                    "<div style='font-family: monospace;'>%s</div>"
                    % get_ph_formatted_time(
                        producer["start"], producer["end"], "US/Pacific"
                    )
                )
                self.write(
                    "<div style='font-family: monospace;'>%s</div>"
                    % get_ph_formatted_time(
                        producer["start"], producer["end"], "Europe/London"
                    )
                )
                self.write(
                    "<div style='font-family: monospace;'>%s</div>"
                    % get_ph_formatted_time(
                        producer["start"], producer["end"], "Asia/Tokyo"
                    )
                )
                self.write("</div></li>")
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/tools/power_hour_detail")
class WebPowerHourDetail(web_api.web.PrettyPrintAPIMixin, power_hours.GetPowerHour):
    def write_error(self, status_code, *args, **kwargs):
        self.write(self.render_string("bare_header.html", title="No Such Power Hour"))
        self.write(
            "<a href='power_hours?sid=%s'>Power hour non-existent or deleted.  Click this line to go back.</a>"
            % self.sid
        )
        self.write(self.render_string("basic_footer.html"))

    def get(self):  # pylint: disable=E0202
        if not isinstance(self._output, dict):
            raise web_api.web.APIException("internal_error", http_code=500)

        ph = self._output[self.return_name]
        self.write(self.render_string("bare_header.html", title="%s" % ph["name"]))
        self.write("<script>\nwindow.top.refresh_all_screens = false;\n</script>")
        self.write("<h2>")
        self.write('<div style="float: right; position: relative; top: -4px; ">')
        self.write(
            "<a onclick=\"window.top.call_api('admin/delete_producer', { 'sched_id': %s });\">🚮</a>"
            % ph["id"]
        )
        self.write("</div>")
        self.write(ph["name"])
        self.write("</h2>")

        ######

        self.write(f'<div class="power_hour">')
        self.write(f'<div class="power_hour__row">')

        self.write('<div class="power_hour__left">')
        self.write("<span>Times from the server:</span><br>")
        self.write(
            "<div style='font-family: monospace;'>%s</div>"
            % get_ph_formatted_time(ph["start"], ph["end"], "US/Eastern")
        )
        self.write(
            "<div style='font-family: monospace;'>%s</div>"
            % get_ph_formatted_time(ph["start"], ph["end"], "US/Pacific")
        )
        self.write(
            "<div style='font-family: monospace;'>%s</div>"
            % get_ph_formatted_time(ph["start"], ph["end"], "Europe/London")
        )
        self.write("</div>")

        self.write('<div class="power_hour__right">')
        total_len = 0
        for song in ph["songs"]:
            total_len += song["length"]
        self.write(
            "<div>Total length of songs: <b>%d:%02d</b></div>"
            % (int(total_len / 3600), (total_len / 60) % 60)
        )
        self.write("</div>")

        self.write("</div>")

        self.write("</div>")

        ####

        self.write(f'<div class="power_hour">')
        self.write(f'<div class="power_hour__row">')

        self.write('<div class="power_hour__left">')
        self.write("<span>Your TZ:</span>")
        index.write_html_time_form(self, "power_hour", ph["start"])
        self.write("</div>")

        self.write('<div class="power_hour__right">')
        self.write(
            "<button onclick=\"window.top.call_api('admin/change_producer_start_time', "
        )
        self.write(
            "{ 'utc_time': document.getElementById('power_hour_timestamp').value, 'sched_id': %s });\""
            % ph["id"]
        )
        self.write(">Change Time</button></div>")

        self.write("</div>")
        self.write("</div>")

        ######

        self.write(f'<div class="power_hour">')
        self.write(f'<div class="power_hour__row">')

        self.write('<div class="power_hour__left">')
        self.write("Name: <input type='text' id='new_ph_name' value='%s'>" % ph["name"])
        self.write("</div>")

        self.write('<div class="power_hour__right">')
        self.write(
            "<button onclick=\"window.top.call_api('admin/change_producer_name', { 'sched_id': %s, 'name': document.getElementById('new_ph_name').value });\">Change Name</button>"
            % ph["id"]
        )
        self.write("</div>")
        self.write("</div>")
        self.write("</div>")

        #####

        self.write(f'<div class="power_hour" style="margin-bottom: 24px;">')
        self.write(f'<div class="power_hour__row">')
        self.write('<div class="power_hour__left">')
        self.write(
            "<button onclick=\"window.top.call_api('admin/shuffle_power_hour', { 'sched_id': %s });\">Shuffle the Song Order</button>\n\n"
            % ph["id"]
        )
        self.write("</div>")
        self.write("</div>")
        self.write("</div>")
        #####

        try:
            for song_index, song in enumerate(ph["songs"]):
                song_origin = config.station_id_friendly[song["origin_sid"]]
                song_class_modifiers = []
                if song["one_up_used"]:
                    song_class_modifiers.append("used")
                song_classes = "power_hour--".join(song_class_modifiers)
                length_seconds = "{:02d}".format(song["length"] % 60)
                length_minutes = math.floor(song["length"] / 60)
                length = f"{length_minutes}:{length_seconds}"

                ## Totality

                self.write(f'<div class="power_hour {song_classes}">')

                ## First row

                self.write(f'<div class="power_hour__row">')

                self.write(
                    f"<div class=\"power_hour__left\">{song_index + 1}. {song['title']}</div>"
                )

                self.write(f"<div class=\"power_hour__right\">({song['rating']})</div>")

                self.write(f'<div class="power_hour__right">{length}</div>')

                self.write(f'<div class="power_hour__right">{song_origin}</div>')

                self.write("</div>")

                ## Second row

                self.write(f'<div class="power_hour__row">')

                self.write(
                    f"<div class=\"power_hour__left power_hour__album\">{song['albums'][0]['name']}</div>"
                )

                self.write('<div class="power_hour__right">')
                self.write(
                    "<a class=\"power_hour__button\" onclick=\"window.top.call_api('admin/remove_from_power_hour', { 'one_up_id': %s });\">🚮</a>"
                    % song["one_up_id"]
                )
                self.write(
                    "<a class=\"power_hour__button\" onclick=\"window.top.call_api('admin/move_up_in_power_hour', { 'one_up_id': %s });\">🔼</a>"
                    % song["one_up_id"]
                )
                self.write("</div>")

                self.write("</div>")

                ## Totality

                self.write("</div>")

            self.write(
                "<script>window.top.current_sched_id = %s;</script>\n\n" % ph["id"]
            )
        except Exception as e:
            self.write("</ol>")
            self.write(
                "<div>ERROR DISPLAYING SONG LIST.  Something is wrong.  Consult Rob.  Do not play this Power Hour.</div>"
            )
            log.exception("admin", "Could not display song list.", e)
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/album_list/power_hours")
class PowerHourAlbumList(AlbumList):
    def render_row_special(self, row):
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/add_album_to_power_hour', { 'album_id': %s, 'sched_id': window.top.current_sched_id, 'album_sid': window.top.current_restriction });\">Add to PH</a>"
            % row["id"]
        )


@handle_url("/admin/song_list/power_hours")
class PowerHourSongList(SongList):
    def render_row_special(self, row):
        self.write(
            "<td><a onclick=\"window.top.call_api('admin/add_song_to_power_hour', { 'song_id': %s, 'sched_id': window.top.current_sched_id, 'song_sid': window.top.current_restriction });\">Add to PH</a>"
            % row["id"]
        )
