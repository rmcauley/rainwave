import tornado.web

from api import fieldtypes
from api.handle_url import handle_url
from api.handler_classes.html_handler import HtmlHandler
from api.helpers import public_relays

from common import config, stations
from typing import Any


def get_round_robin_url(
    sid: int, filetype: str = "mp3", user: Any | None = None
) -> str:
    stream_url = config.round_robin_relay_protocol + config.round_robin_relay_host
    if config.round_robin_relay_port:
        stream_url += ":" + config.round_robin_relay_port
    stream_url += "/" + get_stream_filename(sid, filetype, user)
    return stream_url


def get_stream_filename(
    sid: int, filetype: str = "mp3", user: Any | None = None
) -> str:
    filename = config.stations[sid]["stream_filename"]

    if user is None or user.is_anonymous():
        return "%s.%s" % (filename, filetype)
    else:
        return "%s.%s?%s:%s" % (filename, filetype, user.id, user.data["listen_key"])


@handle_url(r"/tune_in/(\w+|\d)\.(ogg|mp3)(.m3u)?")
class TuneInIndex(HtmlHandler):
    content_type = "audio/x-mpegurl"
    description = (
        "Provides the user with an M3U file containing Ogg or MP3 URLs to relays."
    )
    login_required = False
    auth_required = False
    sid_required = False

    def set_default_headers(self):
        super().set_default_headers()
        self.set_header("Cache-Control", "no-cache, must-revalidate")

    def set_sid(self, url_param: str | None, filetype: str | None):
        if url_param:
            url_param_int = fieldtypes.positive_integer(url_param)
            if not url_param_int:
                for k, v in stations.station_id_friendly.items():
                    if v.lower() == url_param.lower():
                        self.sid = k
                        break
            else:
                self.sid = url_param_int

        if not self.sid:
            raise tornado.web.HTTPError(404)
        if not self.sid in stations.station_ids:
            raise tornado.web.HTTPError(404)

        self.set_header(
            "Content-Disposition",
            'inline; filename="rainwave_%s_%s.m3u"'
            % (stations.station_id_friendly[self.sid].lower(), filetype),
        )

    def get(self, url_param: str, filetype: str, _m3u: str | None = None):
        self.set_sid(url_param, filetype)

        stream_filename = get_stream_filename(self.sid, filetype, self.optional_user)

        self.write(
            "#EXTINF:0,Rainwave %s: %s\n"
            % (
                stations.station_id_friendly[self.sid],
                self.locale.translate("random_relay"),
            )
        )
        self.write(get_round_robin_url(self.sid, filetype, self.optional_user) + "\n")

        for relay in public_relays.public_relays[self.sid]:
            self.write(
                "#EXTINF:0, Rainwave %s: %s Relay\n"
                % (stations.station_id_friendly[self.sid], relay["name"])
            )
            self.write(
                "%s%s:%s/%s\n"
                % (relay["protocol"], relay["hostname"], relay["port"], stream_filename)
            )
