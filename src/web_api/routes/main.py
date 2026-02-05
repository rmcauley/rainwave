import os
import tornado.web
import re
import urllib.parse

import web_api.web
import backend.locale.locale
from web_api.urls import handle_url, handle_api_url
from routes import info

from backend import config
from backend.rainwave.user import User

STATION_REGEX = "|".join(
    stream_filename for stream_filename in config.stream_filename_to_sid.keys()
)
STATION_URL_REGEX = "/(?P<station>{})?/?(?:index.html)?".format(STATION_REGEX)
STATION_URL_REGEX_COMPILED = re.compile(STATION_URL_REGEX)
index_file_location = os.path.join(
    os.path.dirname(__file__),
    "..",
    "static",
    "index.html",
)


@handle_api_url("bootstrap")
class Bootstrap(web_api.web.APIHandler):
    description = (
        "Bootstrap a Rainwave client.  Provides user info, API key, station info, relay info, and more.  "
        "If you run a GET query to this URL, you will receive a Javascript file containing a single variable called BOOTSTRAP.  While this is largely intended for the purposes of the main site, you may use this.  "
        "If you run a POST query to this URL, you will receive a JSON object of the same data."
    )
    phpbb_auth = True
    auth_required = False
    login_required = False
    sid_required = False
    allow_get = False
    is_mobile = False
    content_type = "text/javascript"

    def prepare(self):
        referer = self.request.headers.get("Referer")
        if referer:
            referer_path = urllib.parse.urlparse(referer).path
            referer_match = STATION_URL_REGEX_COMPILED.search(referer_path)
            if (
                referer_match
                and referer_match.group("station")
                and config.stream_filename_to_sid.get(referer_match.group("station"))
            ):
                self.sid = config.stream_filename_to_sid.get(
                    referer_match.group("station")
                )
        super().prepare()
        if not self.user:
            self.user = User(1)
        self.user.ensure_api_key()
        ua = self.request.headers.get("User-Agent") or ""
        self.is_mobile = (
            ua.lower().find("mobile") != -1 or ua.lower().find("android") != -1
        )

    def finish(self, chunk=None):
        self.set_header("Content-Type", self.content_type)
        super(web_api.web.APIHandler, self).finish(chunk)

    def get(self):  # pylint: disable=method-hidden
        self.write("var BOOTSTRAP=")
        self.post()
        self.write(";if(window.rainwaveInit){window.rainwaveInit()}")

    def post(self):
        info.attach_info_to_request(self, live_voting=True)
        self.append("build_version", config.build_number)
        self.append("locale", self.locale.code)
        self.append("locales", backend.locale.locale.locale_names)
        self.append("cookie_domain", config.cookie_domain)
        self.append("on_init", [])
        self.append("on_measure", [])
        self.append("on_draw", [])
        self.append("websocket_host", config.websocket_host)
        self.append("stream_filename", config.get_station(self.sid, "stream_filename"))
        self.append("station_list", config.station_list)
        self.append("relays", config.public_relays[self.sid])
        if self.is_mobile:
            self.append("mobile", True)
        else:
            self.append("mobile", False)
        self.write_output()
