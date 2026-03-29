from abc import ABC, abstractmethod
from http.client import responses
import json
import time
from time import time as timestamp
import traceback
from typing import Any, Type, TypedDict, cast
from urllib.parse import urlencode

import orjson
import pydantic
from tornado import httputil
from tornado.web import Application, HTTPError, RequestHandler

from api import fieldtypes
from api import rainwave_typeddicts
from api.exceptions import APIException
from api.helpers.paginated_requests import get_pagination_params
from api.rainwave_return_key_to_open_api import RainwaveResponse, RainwaveResponseKey
from api.routes.auth.errors import OAuthRejectedError
from api.websocket.websocket_message import RainwaveWebsocketMessage
from common import config, log, stations
from common.db.cursor import RainwaveCursor, get_cursor
from common.locale.rainwave_locale import RainwaveLocale
from common.locale.locale import translations
from common.user.api_key import is_valid_api_key
from common.user.get_anonymous_user import get_authorized_anonymous_user
from common.user.get_registered_user import get_authorized_registered_user
from common.user.model.user_base import UserBase
from api.helpers.get_browser_locale import get_browser_locale
from common.db.connection import db_connection_errors


class SessionApiKeyRow(TypedDict):
    user_id: int
    api_key: str


class RainwaveHandler(RequestHandler, ABC):
    # What is the response type?
    content_type = "text/html"
    # Do we need a Rainwave auth key for this request?
    auth_required = False
    # Validate user's tuned in status first.
    tunein_required = False
    # Validate user's logged in status first.
    login_required = False
    # Validate user is a station administrator.
    admin_required = False
    # Do we need a valid SID as part of the submitted form?
    sid_required = True
    # Restricts requests to config.api_trusted_ip_addresses (presumably 127.0.0.1)
    local_only = False
    # Does the user need perks (donor/beta/etc) to see this request/page?
    perks_required = False
    # Automatically add pagination to an API request.
    pagination = False
    # Set to True to allow from any source
    allow_cors = False
    # Should the user be free to vote and rate?
    unlocked_listener_only = False
    # Should the output of this API request be pretty-printed from its JSON?
    pretty_print_html = False

    optional_user: UserBase | None = None
    locale: RainwaveLocale = translations["en-CA"]  # type: ignore
    response: RainwaveResponse = {}
    startclock: float
    sid: int

    websocket_handling: bool
    websocket_message: RainwaveWebsocketMessage | None
    websocket_uuid: str | None
    websocket_sid: int | None
    _rainwave_output_written: bool

    @property
    @abstractmethod
    def return_name(cls) -> RainwaveResponseKey:
        # Every request must provide this for pretty-print HTML
        # abstractions to work.
        raise NotImplementedError

    def __init__(
        self,
        application: Application,
        request: httputil.HTTPServerRequest,
        *args: Any,
        websocket_handling: bool = False,
        websocket_message: RainwaveWebsocketMessage | None = None,
        websocket_user: UserBase | None = None,
        websocket_sid: int | None = None,
        websocket_locale: RainwaveLocale | None = None,
        websocket_uuid: str | None = None,
        **kwargs: Any,
    ) -> None:
        # Properties that are websocket-explicit and should be defined per-class-instance
        self.websocket_handling = websocket_handling
        self.websocket_message = websocket_message
        self.websocket_sid = websocket_sid
        self.websocket_uuid = websocket_uuid
        self._rainwave_output_written = False

        # Properties where websocket arguments override HTTP processing
        if websocket_user is not None:
            self.optional_user = websocket_user
        if websocket_locale is not None:
            self.rainwave_locale = websocket_locale

        super().__init__(application, request, *args, **kwargs)

    # Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
    async def prepare(self) -> None:
        self.startclock = time.monotonic()
        self._rainwave_output_written = False

        user: UserBase | None = self.optional_user
        if not self.websocket_handling:
            user = await self._prepare_http()
        else:
            if self.websocket_sid is None:
                raise APIException("missing_station_id", status_code=400)
            self.sid = self.websocket_sid

        if not user and self.auth_required:
            raise APIException("auth_required", status_code=403)

        self.permission_checks(user, self.sid)

        self.optional_user = user

    async def _prepare_http(self) -> UserBase | None:
        self.response = {}

        if (
            self.local_only
            and not self.request.remote_ip in config.api_trusted_ip_addresses
        ):
            raise APIException("404")

        if self.allow_cors:
            self.set_header("Access-Control-Allow-Origin", "*")
            self.set_header("Access-Control-Max-Age", "600")
            self.set_header("Access-Control-Allow-Credentials", "false")

        self.rainwave_locale = get_browser_locale(self)

        sid = fieldtypes.integer(self.get_cookie("r4_sid", None))

        request_sid_argument = fieldtypes.integer(self.get_argument("sid", None))
        if request_sid_argument is not None:
            sid = request_sid_argument

        if sid is None and self.sid_required:
            raise APIException("missing_station_id", status_code=400)

        if sid is None:
            sid = config.default_station
        elif not sid in stations.station_ids:
            raise APIException("invalid_station_id", status_code=400)

        self.sid = sid

        self.set_cookie("r4_sid", str(self.sid), expires_days=365)

        user: UserBase | None = None
        async with get_cursor() as cursor:
            user = await self.rainwave_auth(cursor, self.sid)
        return user

    def set_default_headers(self) -> None:
        self.set_header("Content-Type", self.content_type)

    def set_cookie(self, name: str, value: Any, *args: Any, **kwargs: Any) -> None:
        if isinstance(value, int):
            value = repr(value)
        super().set_cookie(name, value, *args, secure=True, samesite="strict", **kwargs)

    def permission_checks(self, user: UserBase | None, sid: int) -> None:
        if self.auth_required and not user:
            raise APIException("missing_argument", argument="user_id", status_code=400)
        if (self.login_required or self.admin_required) and (
            not user or user.is_anonymous()
        ):
            raise APIException("login_required", status_code=403)
        if self.tunein_required and (not user or not user.is_tunedin()):
            raise APIException("tunein_required", status_code=403)
        if self.admin_required and (not user or not user.is_admin()):
            raise APIException("admin_required", status_code=403)
        if self.perks_required and (not user or not user.has_perks()):
            raise APIException("perks_required", status_code=403)

        if self.unlocked_listener_only:
            if user is None:
                raise APIException("auth_required", status_code=403)
            user_lock_sid = (
                user.private_data["lock_sid"] if user.private_data["lock"] else None
            )
            if user_lock_sid and user_lock_sid != sid:
                raise APIException(
                    "unlocked_only",
                    station=config.stations[user_lock_sid]["name"],
                    lock_counter=user.private_data["lock_counter"],
                    status_code=403,
                )

    async def rainwave_auth(self, cursor: RainwaveCursor, sid: int) -> UserBase | None:
        api_key: str | None = None
        user_id: int | None = None
        session_from_cookie = self.get_cookie("r4_session_id")
        if session_from_cookie:
            # If we have a session ID and it's valid for this user, we also select
            # an API key here to simplify our "refresh user data" function later
            # which joins to the API keys table.  Cuts down on branches.
            session_api_key_row = await cursor.fetch_row(
                "SELECT user_id, api_key FROM r4_sessions JOIN r4_api_keys USING (user_id) WHERE session_id = %s LIMIT 1",
                (session_from_cookie,),
                row_type=SessionApiKeyRow,
            )
            if session_api_key_row:
                user_id = session_api_key_row["user_id"]
                api_key = session_api_key_row["api_key"]

        user_id_present = "user_id" in self.request.arguments
        if user_id_present:
            user_id = fieldtypes.positive_integer(self.get_argument("user_id"))
            if user_id is None:
                raise APIException(
                    "invalid_argument",
                    argument="user_id",
                    reason="missing or not numeric.",
                    status_code=400,
                )

            if not "key" in self.request.arguments:
                raise APIException("missing_argument", argument="key", status_code=400)

            api_key = self.get_argument("key")
            if not is_valid_api_key(api_key):
                raise APIException("auth_failed", "Invalid API key.", status_code=400)

        if user_id is None and api_key is None:
            return None

        if user_id is None:
            raise APIException(
                "invalid_argument",
                argument="user_id",
                reason="missing or not numeric.",
                status_code=400,
            )

        if api_key is None:
            raise APIException(
                "invalid_argument",
                argument="api_key",
                reason="missing or invalid.",
                status_code=400,
            )

        if user_id == 1:
            # casted self.request_remote_ip: it comes from httputils and is guaranteed to be a str
            return await get_authorized_anonymous_user(
                cursor, sid, user_id, api_key, cast(str, self.request.remote_ip)
            )

        return await get_authorized_registered_user(
            # casted self.request_remote_ip: it comes from httputils and is guaranteed to be a str
            cursor,
            sid,
            user_id,
            api_key,
            cast(str, self.request.remote_ip),
        )

    def _write_rainwave_output(self) -> None:
        if self._rainwave_output_written:
            raise RuntimeError(
                f"{self.__class__.__name__} attempted to write Rainwave output twice."
            )
        if self.pretty_print_html:
            self._write_rainwave_output_json_pretty_print_html()
        else:
            self._write_rainwave_output_json()
        self._rainwave_output_written = True

    def _write_rainwave_output_json(self) -> None:
        exectime = time.monotonic() - self.startclock
        if exectime > 0.5:
            log.warn(
                "long_request",
                "%s took %s to execute!" % (self.__class__.__name__, exectime),
            )
        self.response["api_info"] = {
            "exectime": int(exectime),
            "time": int(timestamp()),
        }
        self.write(orjson.dumps(self.response))

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        if (
            self.content_type == "application/json"
            or self.content_type == "text/javascript"
        ):
            self.write(
                orjson.dumps(self.get_json_error_response(status_code, **kwargs))
            )
        else:
            self._write_error_html(status_code, **kwargs)

    def get_json_error_response(
        self, status_code: int, **kwargs: Any
    ) -> RainwaveResponse:
        response: RainwaveResponse = {}
        if "message_id" in self.response:
            response["message_id"] = self.response["message_id"]

        response["error"] = {
            "tl_key": "internal_error",
            "text": self.locale.translate("internal_error"),
            "code": 500,
            "success": False,
        }

        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]

            if isinstance(exc, db_connection_errors):
                response["error"] = {
                    "code": 500,
                    "tl_key": "db_error_retry",
                    "text": self.locale.translate("db_error_retry"),
                }
            elif isinstance(exc, APIException):
                response["error"] = exc.to_api(self.locale)
            else:
                response["error"] = {
                    "code": status_code,
                    "tl_key": "internal_error",
                    "text": repr(exc),
                    "traceback": "\n".join(
                        traceback.format_exception(
                            kwargs["exc_info"][0],
                            kwargs["exc_info"][1],
                            kwargs["exc_info"][2],
                        )
                    ),
                }
        else:
            response["error"] = {
                "code": 500,
                "tl_key": "internal_error",
                "text": self.locale.translate("internal_error"),
            }

        return response

    def _write_error_html(self, status_code: int, **kwargs: Any) -> None:
        title = "HTTP %s - %s" % (
            status_code,
            responses.get(status_code, "Unknown"),
        )

        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]

            if isinstance(exc, OAuthRejectedError):
                title = self.locale.translate("oauth_rejected")
            elif isinstance(exc, APIException):
                title = exc.to_api(self.locale).get("text") or exc.tl_key
            elif isinstance(exc, (APIException, HTTPError)) and exc.reason:
                title = "%s - %s" % (status_code, exc.reason)

        self.write(self.render_string("basic_header.html", title=title))

        if status_code == 500:
            self.write("<p>")
            self.write(self.locale.translate("unknown_error_message"))
            self.write("</p><p>")
            self.write(self.locale.translate("debug_information"))
            self.write("</p><div class='json'>")
            for line in traceback.format_exception(
                kwargs["exc_info"][0], kwargs["exc_info"][1], kwargs["exc_info"][2]
            ):
                self.write(line)
            self.write("</div>")

        self.write(self.render_string("basic_footer.html"))

    def _write_rainwave_output_json_pretty_print_html(self) -> None:
        title_key = cast(rainwave_typeddicts.TranslationKey, self.return_name)
        try:
            title = self.locale.translate(title_key)
        except KeyError:
            title = self.return_name

        self.write(
            self.render_string(
                "basic_header.html",
                title=title,
            )
        )

        (per_page, page_start) = get_pagination_params(self)
        previous_page_link: str | None = None
        next_page_link: str | None = None
        previous_page_start = None
        next_page_start = None
        if self.pagination:
            if fieldtypes.integer(self.get_argument("page_start", None)):
                previous_page_start = max(page_start - per_page, 0)
                next_page_start = page_start + per_page
            else:
                next_page_start = per_page

            base_args: dict[str, str | int] = {
                key: self.get_argument(key)
                for key in self.request.arguments
                if key != "page_start"
            }
            base_args["per_page"] = per_page
            next_page_link_url = "?%s" % urlencode(
                {**base_args, "page_start": next_page_start}
            )
            previous_page_link_url: str | None = None
            if page_start > 0:
                previous_page_link_url = "?%s" % urlencode(
                    {**base_args, "page_start": previous_page_start}
                )

            if page_start > 0:
                previous_page_link = (
                    "<div><a href='%s'>&lt;&lt; Previous Page</a></div>"
                    % previous_page_link_url
                )
                self.write(previous_page_link)

            return_name_response = self.response.get(self.return_name, None)
            if (
                return_name_response
                and isinstance(return_name_response, list)
                and len(cast(list[Any], return_name_response)) >= per_page
            ):
                next_page_link = (
                    "<div><a href='%s'>Next Page &gt;&gt;</a></div>"
                    % next_page_link_url
                )
                self.write(next_page_link)
            elif not self.return_name in self.response:
                next_page_link = (
                    "<div><a href='%s'>Next Page &gt;&gt;</a></div>"
                    % next_page_link_url
                )
                self.write(next_page_link)

        for response_key, response_value in self.response.items():
            if not isinstance(response_value, list):
                continue
            response_value = cast(list[dict[str, Any]], response_value)
            if len(response_value) > 0:
                self.write("<table class='%s'><th>#</th>" % response_key)
                keys = getattr(
                    self,
                    "columns",
                    self.pretty_print_sort_keys(list(response_value[0].keys())),
                )
                for key in keys:
                    self.write("<th>%s</th>" % self.locale.translate(key))
                self.pretty_print_header_special()
                self.write("</th>")
                i = 1
                if "page_start" in self.request.arguments:
                    i += page_start
                for row in response_value:
                    self.write("<tr><td>%s</td>" % i)
                    for key in keys:
                        if key == "sid":
                            self.write(
                                "<td>%s</td>" % config.stations[row[key]]["name"]
                            )
                        else:
                            self.write("<td>%s</td>" % row[key])
                    self.pretty_print_row_special(row)
                    self.write("</tr>")
                    i = i + 1
                self.write("</table>")
            else:
                self.write("<p>%s</p>" % self.locale.translate("no_results"))

        if self.pagination:
            if previous_page_link:
                self.write(previous_page_link)
            if next_page_link:
                self.write(next_page_link)

        self.write(self.render_string("basic_footer.html"))

    def pretty_print_header_special(self) -> None:
        pass

    def pretty_print_row_special(self, row: dict[str, Any]) -> None:
        pass

    def pretty_print_sort_keys(self, keys: list[str]) -> list[str]:
        new_keys: list[str] = []
        for key in ["rating_user", "fave", "title", "album_rating_user", "album_name"]:
            if key in keys:
                new_keys.append(key)
        new_keys.extend(key for key in keys if key not in new_keys)
        return new_keys

    def get_validated_input[T: pydantic.BaseModel](
        self, dto: Type[T], data: Any = None
    ) -> T:
        try:
            if data is None:
                if self.websocket_message is not None:
                    data = self.websocket_message
                else:
                    data = self._get_request_validation_data()
            return dto.model_validate(data)
        except pydantic.ValidationError as exc:
            for err in exc.errors():
                field = (
                    ".".join(str(part) for part in err["loc"] if part != "__root__")
                    or "body"
                )

                # missing required value
                if err["type"] == "missing":
                    raise APIException(
                        "missing_argument",
                        argument=field,
                        status_code=400,
                    )

                # everything else -> invalid argument
                reason = err.get("msg") or "invalid value"
                # optional: use expected type if available
                expected = err.get("ctx", {}).get("expected_type")
                if expected:
                    reason = f"{field} should be {expected} type"

                raise APIException(
                    "invalid_argument",
                    argument=field,
                    status_code=400,
                    reason=reason,
                )

            # fallback (normally unreachable because loop handles all errors)
            raise APIException("invalid_argument", argument="request", status_code=400)

    def _get_request_validation_data(self) -> Any:
        content_type = self.request.headers.get("Content-Type", "")
        if "application/json" in content_type and self.request.body:
            return json.loads(self.request.body)

        normalized: dict[str, str | list[str]] = {}
        for key, values in self.request.arguments.items():
            decoded_values = [value.decode("utf-8") for value in values]
            normalized[key] = (
                decoded_values[0] if len(decoded_values) == 1 else decoded_values
            )
        return normalized
