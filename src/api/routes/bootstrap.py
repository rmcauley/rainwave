import re
from typing import cast
import urllib.parse

import orjson

from api.handler_classes.rainwave_handler import RainwaveHandler
from api.helpers.public_relays import public_relays
from api.helpers.station_list import station_list
from api.helpers.get_station_info import get_station_info
from common.db.cursor import get_cursor
import common.locale.locale
from api.handle_url import handle_api_url

from common import config, stations
from common.user.model.anonymous_user import AnonymousUser

STATION_REGEX = "|".join(
    stream_filename for stream_filename in stations.stream_filename_to_sid.keys()
)
STATION_URL_REGEX = "/(?P<station>{})?/?(?:index.html)?".format(STATION_REGEX)
STATION_URL_REGEX_COMPILED = re.compile(STATION_URL_REGEX)


@handle_api_url("bootstrap")
class Bootstrap(RainwaveHandler):
    content_type = "text/javascript"
    description = (
        "Bootstrap a Rainwave client.  Provides user info, API key, station info, relay info, and more.  "
        "If you run a GET query to this URL, you will receive a Javascript file containing a single variable called BOOTSTRAP.  While this is largely intended for the purposes of the main site, you may use this.  "
        "If you run a POST query to this URL, you will receive a JSON object of the same data."
    )
    auth_required = False
    sid_required = False

    @property
    def return_name(self):
        return "error"

    def set_default_headers(self) -> None:
        # This request sets the content_type based on
        # whether it is GET or POST, so we must override the
        # parent class set_default_headers to not set content_type here.
        pass

    async def prepare(self):
        referer = self.request.headers.get("Referer")
        if referer:
            referer_path = urllib.parse.urlparse(referer).path
            referer_match = STATION_URL_REGEX_COMPILED.search(referer_path)
            if (
                referer_match
                and referer_match.group("station")
                and stations.stream_filename_to_sid.get(referer_match.group("station"))
            ):
                self.sid = (
                    stations.stream_filename_to_sid.get(referer_match.group("station"))
                    or config.default_station
                )

        await super().prepare()

        if not self.optional_user:
            async with get_cursor() as cursor:
                self.optional_user = (
                    await AnonymousUser.create_anonymous_user_with_api_key(
                        cursor, self.sid, cast(str, self.request.remote_ip)
                    )
                )

    async def get(self):
        self.set_header("Content-Type", "text/javascript")
        self.write("var BOOTSTRAP=")
        await self._make_payload()
        self.write(orjson.dumps(self.response))
        self.write(";if(window.rainwaveInit){window.rainwaveInit()}")

    async def post(self):
        self.set_header("Content-Type", "application/json")
        await self._make_payload()
        self.write(orjson.dumps(self.response))

    async def _make_payload(self):
        async with get_cursor() as cursor:
            self.response.update(
                await get_station_info(
                    cursor,
                    self.optional_user,
                    self.sid,
                    include_request_line=True,
                    include_live_voting=True,
                )
            )
        self.response["build_version"] = 1000
        self.response["locale"] = self.locale.code
        self.response["locales"] = common.locale.locale.locale_names
        self.response["cookie_domain"] = config.cookie_domain
        self.response["websocket_host"] = config.websocket_host
        self.response["stream_filename"] = config.stations[
            self.sid or config.default_station
        ]["stream_filename"]
        self.response["station_list"] = station_list
        self.response["relays"] = public_relays[self.sid or config.default_station]
