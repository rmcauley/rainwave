from abc import ABC, abstractmethod
from typing import Any, cast

from tornado.web import RequestHandler

from api import fieldtypes
from api.exceptions import APIException
from api.rainwave_openapi import RainwaveErrorObject
from api.rainwave_return_key_to_open_api import RainwaveResponse, RainwaveResponseKey
from common import config
from common.db.cursor import RainwaveCursor, get_cursor
from common.locale.rainwave_locale import RainwaveLocale
from common.locale.locale import translations
from common.user.api_key import is_valid_api_key
from common.user.get_anonymous_user import get_authorized_anonymous_user
from common.user.get_registered_user import get_authorized_registered_user
from common.user.model.user_base import UserBase
from api.helpers.get_browser_locale import get_browser_locale


class RainwaveHandler(RequestHandler, ABC):
    content_type = "text/html"
    # Do we need a Rainwave auth key for this request?
    auth_required = True
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
    # set to allow from any source
    allow_cors = False
    # Should the user be free to vote and rate?
    unlocked_listener_only = False

    user: UserBase | None = None
    locale: RainwaveLocale = translations["en-CA"]  # type: ignore
    response: RainwaveResponse = {}
    error_response: dict[RainwaveResponseKey, RainwaveErrorObject] = {}

    # Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
    async def prepare(self) -> None:
        self.response = {}
        self.error_response = {}

        if (
            self.local_only
            and not self.request.remote_ip in config.api_trusted_ip_addresses
        ):
            raise APIException(
                "rejected", text="You are not coming from a trusted address."
            )

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
            raise APIException("missing_station_id", http_code=400)

        if sid is None and not self.sid_required:
            self.sid = config.default_station
        elif sid:
            self.sid = sid
        elif not self.sid in config.station_ids:
            raise APIException("invalid_station_id", http_code=400)

        if self.sid:
            self.set_cookie("r4_sid", str(self.sid), expires_days=365)

        user: UserBase | None = None
        async with get_cursor() as cursor:
            user = await self.rainwave_auth(cursor, self.sid)

        if not user and self.auth_required:
            raise APIException("auth_required", http_code=403)

        self.permission_checks(user, self.sid)

        self.user = user

    def set_default_headers(self) -> None:
        self.set_header("Content-Type", self.content_type)

    @abstractmethod
    def get_request_args(self) -> None:
        raise NotImplementedError()

    @property
    @abstractmethod
    def return_name(self) -> RainwaveResponseKey:
        raise NotImplementedError()

    def set_cookie(self, name: str, value: Any, *args: Any, **kwargs: Any) -> None:
        if isinstance(value, int):
            value = repr(value)
        super().set_cookie(name, value, *args, secure=True, samesite="strict", **kwargs)

    def permission_checks(self, user: UserBase | None, sid: int) -> None:
        if self.auth_required and not user:
            raise APIException("missing_argument", argument="user_id", http_code=400)
        if (self.login_required or self.admin_required) and (
            not user or user.is_anonymous()
        ):
            raise APIException("login_required", http_code=403)
        if self.tunein_required and (not user or not user.is_tunedin()):
            raise APIException("tunein_required", http_code=403)
        if self.admin_required and (not user or not user.is_admin()):
            raise APIException("admin_required", http_code=403)
        if self.perks_required and (not user or not user.has_perks()):
            raise APIException("perks_required", http_code=403)

        if self.unlocked_listener_only:
            if user is None:
                raise APIException("auth_required", http_code=403)
            user_lock_sid = (
                user.private_data["lock_sid"] if user.private_data["lock"] else None
            )
            if user_lock_sid and user_lock_sid != sid:
                raise APIException(
                    "unlocked_only",
                    station=config.stations[user_lock_sid]["name"],
                    lock_counter=user.private_data["lock_counter"],
                    http_code=403,
                )

    async def rainwave_auth(self, cursor: RainwaveCursor, sid: int) -> UserBase | None:
        user_id_present = "user_id" in self.request.arguments
        if not user_id_present:
            return None

        user_id = fieldtypes.positive_integer(self.get_argument("user_id"))
        if user_id is None:
            # do not spit out the user ID back at them, that would create a potential XSS hack
            raise APIException(
                "invalid_argument",
                argument="user_id",
                reason="not numeric.",
                http_code=400,
            )

        if user_id and not "key" in self.request.arguments:
            raise APIException("missing_argument", argument="key", http_code=400)

        api_key = self.get_argument("key")
        if not is_valid_api_key(api_key):
            raise APIException("auth_failed", "Invalid API key.", http_code=400)

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
