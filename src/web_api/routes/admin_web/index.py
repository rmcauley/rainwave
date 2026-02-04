import time
import calendar
import tornado.web
import tornado.escape
import datetime

from src.backend import config
from src.backend.libs import db
from libs import cache

import web_api.web
from web_api.web import APIException
from web_api.urls import handle_url
from web_api import fieldtypes

import routes.playlist
from typing import Any


def write_html_time_form(
    request: Any, html_id: str, at_time: int | None = None
) -> None:
    current_time = calendar.timegm(time.gmtime())
    if not at_time:
        at_time = current_time
    year_range_start = datetime.datetime.now().year
    year_range_end = datetime.datetime.now().year + 3
    request.write(
        request.render_string(
            "admin_time_select.html",
            at_time=at_time,
            html_id=html_id,
            year_range_start=year_range_start,
            year_range_end=year_range_end,
        )
    )


@handle_url("/admin")
class AdminRedirect(tornado.web.RequestHandler):
    help_hidden = True

    def prepare(self):
        self.redirect("/admin/", permanent=True)


@handle_url("/admin/")
class AdminIndex(web_api.web.HTMLRequest):
    admin_required = True

    def get(self):
        sid = 5 if 5 in config.station_ids else self.sid

        self.render(
            "admin_frame.html",
            title="Rainwave Admin",
            api_url=config.api_external_url_prefix,
            user_id=self.user.id,
            api_key=self.user.ensure_api_key(),
            sid=sid,
            tool_list_url="tool_list",
            station_list_url="station_list",
        )


@handle_url("/admin/tool_list")
class ToolList(web_api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="Tool List"))
        # [ ( "Link Title", "admin_url" ) ]
        for item in [
            ("All Stations:", ""),
            ("Song Upload Errors", "scan_results"),
            # ("Producers", "producers"),
            ("PHs & PVPs", "producers_all"),
            ("", ""),
            ("Selected Station:", ""),
            ("PH Creator", "power_hours"),
            # ("DJ Elections", "dj_election"),
            ("Cooldown Multiplier Editor", "cooldown"),
            ("Songs That Are Request Only", "song_request_only"),
            ("", ""),
            ("Other", ""),
            ("Patreon/Tip Jar Manager", "donations"),
            # ("Associate Groups", "associate_groups"),
            # ("Disassociate Groups", "disassociate_groups"),
            # ("Edit Groups", "group_edit"),
            ("Website Crash Reports", "js_errors"),
        ]:
            if item[0] == "":
                self.write("<br>")
            elif item[1] == "":
                self.write(f"<b>{item[0]}</b>")
            else:
                self.write(
                    '<a style=\'display: block\' id="%s" href="#" onclick="window.top.current_tool = \'%s\'; window.top.change_screen();">%s</a>'
                    % (item[1], item[1], item[0])
                )
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/station_list")
class StationList(web_api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="Station List"))
        self.write("<b>On station:</b><br>")
        for sid in config.station_ids:
            self.write(
                '<a style=\'display: block\' id="sid_%s" href="#" onclick="window.top.current_station = %s; window.top.change_screen();">%s</a>'
                % (sid, sid, config.station_id_friendly[sid])
            )
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/restrict_songs")
class RestrictList(web_api.web.HTMLRequest):
    dj_preparation = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="Station List"))
        self.write("<b>With songs from:</b><br>")
        for sid in config.station_ids:
            self.write(
                '<a style=\'display: block\' id="sid_%s" href="#" onclick="window.top.current_restriction = %s; window.top.change_screen();">%s</a>'
                % (sid, sid, config.station_id_friendly[sid])
            )
        # self.write(
        #     '<a style=\'display: block\' id="sid_%s" href="#" onclick="window.top.current_restriction = %s; window.top.change_screen();">%s</a>'
        #     % (0, 0, "DJ Only")
        # )
        self.write("<br>")
        self.write("<b>Sort Songs By:</b>")
        self.write(
            '<a style=\'display: block\' id="sort_%s" href="#" onclick="window.top.current_sort = \'%s\'; window.top.change_screen();">%s</a>'
            % ("alpha", "alpha", "Alphabetical Order")
        )
        self.write(
            '<a style=\'display: block\' id="sort_%s" href="#" onclick="window.top.current_sort = \'%s\'; window.top.change_screen();">%s</a>'
            % ("added_on", "added_on", "Newest Songs First")
        )
        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/relay_status")
class RelayStatus(web_api.web.HTMLRequest):
    dj_required = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="Relay Status"))
        status = cache.get("relay_status")
        self.write("<div style='float: right'>")
        if status:
            for relay, count in status.items():
                self.write("%s: %s listeners<br />" % (relay, count))
        else:
            self.write("No relay status available.")
        self.write("</div>")
        self.write("<div>")
        total = 0
        for row in db.c.fetch_all(
            "SELECT sid, lc_guests AS c FROM r4_listener_counts ORDER BY lc_time DESC, sid LIMIT %s",
            (len(config.station_ids),),
        ):
            total += row["c"]
            self.write(
                "%s: %s listeners<br />"
                % (config.station_id_friendly[row["sid"]], row["c"])
            )
        if total == 0:
            self.write("No listener stats available.")
        else:
            self.write("<br />")
            self.write("<b>Total: %s listeners</b>" % total)
        self.write("</div>")
        self.write(self.render_string("basic_footer.html"))


class AlbumList(web_api.web.HTMLRequest):
    admin_required = True
    allow_get = True
    allow_sid_zero = True
    fields = {"restrict": (fieldtypes.sid, True), "sort": (fieldtypes.string, None)}

    def get(self):
        self.write(self.render_string("bare_header.html", title="Album List"))
        self.write(
            "<h2>%s Playlist</h2>"
            % config.station_id_friendly[self.get_argument("restrict")]
        )
        self.write("<table>")
        sql = (
            "SELECT r4_albums.album_id AS id, album_name AS name, album_name_searchable AS name_searchable, album_rating AS rating, album_cool AS cool, album_cool_lowest AS cool_lowest, album_updated AS updated, album_fave AS fave, album_rating_user AS rating_user, album_cool_multiply AS cool_multiply, album_cool_override AS cool_override "
            "FROM r4_albums "
            "JOIN r4_album_sid USING (album_id) "
            "LEFT JOIN r4_album_ratings ON (r4_album_sid.album_id = r4_album_ratings.album_id AND r4_album_ratings.user_id = %s AND r4_album_ratings.sid = r4_album_sid.sid) "
            "LEFT JOIN r4_album_faves ON (r4_album_sid.album_id = r4_album_faves.album_id AND r4_album_faves.user_id = %s) "
            "WHERE r4_album_sid.sid = %s AND r4_album_sid.album_exists = TRUE "
        )
        if self.get_argument("sort", None) and self.get_argument("sort") == "added_on":
            sql += "ORDER BY album_newest_song_time DESC, album_name"
        else:
            sql += "ORDER BY album_name"
        albums = db.c.fetch_all(
            sql, (self.user.id, self.user.id, self.get_argument("restrict"))
        )
        for row in albums:
            self.write("<tr><td>%s</td>" % row["id"])
            self.write(
                "<td onclick=\"window.location.href = '../song_list/' + window.top.current_tool + '?sid=%s&id=%s&sort=%s';\" style='cursor: pointer;'>%s</td><td>"
                % (
                    self.get_argument("restrict"),
                    row["id"],
                    self.get_argument("sort", ""),
                    tornado.escape.xhtml_escape(row["name"]),
                )
            )
            if row["rating_user"]:
                self.write(str(row["rating_user"]))
            self.write("</td><td>(%s)</td><td>" % row["rating"])
            if row["fave"]:
                self.write("Fave")
            self.write("</td>")
            self.render_row_special(row)
            self.write("</tr>")
        self.write(self.render_string("basic_footer.html"))

    def render_row_special(self, row):
        pass


class SongList(web_api.web.PrettyPrintAPIMixin, routes.playlist.AlbumHandler):
    admin_required = True
    allow_sid_zero = True
    # fields are handled by AlbumHandler

    def get(self):  # pylint: disable=method-hidden
        if not isinstance(self._output, dict):
            raise APIException("internal_error", http_code=500)

        self.write(self.render_string("bare_header.html", title="Song List"))
        self.write(
            "<h2>%s (%s)</h2>"
            % (self._output["album"]["name"], config.station_id_friendly[self.sid])
        )
        self.write("<table>")
        for row in self._output["album"]["songs"]:
            self.write(
                "<tr><td>%s</th><td>%s</td>"
                % (row["id"], tornado.escape.xhtml_escape(row["title"]))
            )
            if row["rating"]:
                self.write("<td>(%s)</td>" % row["rating"])
            elif "rating" in row:
                self.write("<td></td>")
            if row["rating_user"]:
                self.write("<td>%s</td>" % str(row["rating_user"]))
            elif "rating_user" in row:
                self.write("<td></td>")
            if row["fave"]:
                self.write("<td>Your Fave</td>")
            elif "fave" in row:
                self.write("<td></td>")
            if row["length"]:
                self.write(
                    "<td>{}:{:0>2d}</td>".format(
                        int(row["length"] / 60), row["length"] % 60
                    )
                )
            elif "length" in row:
                self.write("<td></td>")
            if row["added_on"]:
                self.write(
                    "<td>%sd</td>" % int((time.time() - row["added_on"]) / 86400)
                )
            elif "added_on" in row:
                self.write("<td></td>")
            if row["origin_sid"]:
                self.write(
                    "<td>%s</td>" % config.station_id_friendly[row["origin_sid"]]
                )
            elif "origin_sid" in row:
                self.write("<td></td>")
            self.render_row_special(row)
            self.write("</tr>")
        self.write(self.render_string("basic_footer.html"))

    def render_row_special(self, row):
        pass


def register_routes() -> None:
    # Import route modules for decorator side effects.
    from . import (
        cooldown,
        developer,
        dj_election,
        donations,
        groups,
        js_errors,
        power_hours,
        producers,
        scan_errors,
        song_request_only,
    )

    _ = (
        cooldown,
        developer,
        dj_election,
        donations,
        groups,
        js_errors,
        power_hours,
        producers,
        scan_errors,
        song_request_only,
    )
