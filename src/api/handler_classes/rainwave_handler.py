from abc import ABC, abstractmethod
from typing import Any

from tornado.web import RequestHandler

from api.exceptions import APIException
from common import config
from common.locale.rainwave_locale import RainwaveLocale
from common.user.model.user_base import UserBase
from api.helpers.get_browser_locale import get_browser_locale


class RainwaveHandler(RequestHandler, ABC):
    # This URL variable is setup by the server decorator - DON'T TOUCH IT.
    url = ""
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
    # Do we allow GET HTTP requests to this URL?  (standard is "no")
    allow_get = False
    # Does the user need perks (donor/beta/etc) to see this request/page?
    perks_required = False
    # automatically add pagination to an API request.  use self.get_sql_limit_string()!
    pagination = False
    # set to allow from any source
    allow_cors = False
    # Should the user be free to vote and rate?
    unlocked_listener_only = False

    user: UserBase
    rainwave_locale: RainwaveLocale

    @abstractmethod
    def get_request_args(self) -> None:
        raise NotImplementedError

    def set_cookie(self, name: str, value: Any, *args: Any, **kwargs: Any) -> None:
        if isinstance(value, int):
            value = repr(value)
        super().set_cookie(name, value, *args, secure=True, samesite="strict", **kwargs)

    def sid_check(self, sid: int | None) -> None:
        if sid is None and not self.sid_required:
            self.sid = config.default_station
        elif not self.sid in config.station_ids:
            raise APIException("invalid_station_id", http_code=400)

    def permission_checks(self) -> None:
        if (self.login_required or self.admin_required) and (
            not self.user or self.user.is_anonymous()
        ):
            raise APIException("login_required", http_code=403)
        if self.tunein_required and (not self.user or not self.user.is_tunedin()):
            raise APIException("tunein_required", http_code=403)
        if self.admin_required and (not self.user or not self.user.is_admin()):
            raise APIException("admin_required", http_code=403)
        if self.perks_required and (not self.user or not self.user.has_perks()):
            raise APIException("perks_required", http_code=403)

        user_lock_sid = (
            self.user.private_data["lock_sid"]
            if self.user.private_data["lock"]
            else None
        )

        if self.unlocked_listener_only and not self.user:
            raise APIException("auth_required", http_code=403)
        elif (
            self.unlocked_listener_only and user_lock_sid and user_lock_sid != self.sid
        ):
            raise APIException(
                "unlocked_only",
                station=config.stations[user_lock_sid]["name"],
                lock_counter=self.user.private_data["lock_counter"],
                http_code=403,
            )

    # Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
    def prepare(self) -> None:
        if (
            self.local_only
            and not self.request.remote_ip in config.web_api_trusted_ip_addresses
        ):
            raise APIException(
                "rejected", text="You are not coming from a trusted address."
            )

        if self.allow_cors:
            self.set_header("Access-Control-Allow-Origin", "*")
            self.set_header("Access-Control-Max-Age", "600")
            self.set_header("Access-Control-Allow-Credentials", "false")

        self.rainwave_locale = get_browser_locale(self)

        self.setup_output()

        if "in_order" in self.request.arguments:
            self._output = []
            self._output_array = True
        else:
            self._output = {}

        if not self.sid:
            self.sid = fieldtypes.integer(self.get_cookie("r4_sid", None))
            hostname = self.request.headers.get("Host", None)
            if hostname:
                hostname = str(hostname).split(":")[0]
            sid_arg = fieldtypes.integer(self.get_argument("sid", None))
            if sid_arg is not None:
                self.sid = sid_arg
            if self.sid is None and self.sid_required:
                raise APIException("missing_station_id", http_code=400)

        self.arg_parse()

        self.sid_check()

        if self.sid:
            self.set_cookie("r4_sid", str(self.sid), expires_days=365)

        if self.phpbb_auth:
            if not self.do_rw_session_auth():
                self.do_phpbb_auth()
        else:
            self.rainwave_auth()

        if not self.user and self.auth_required:
            raise APIException("auth_required", http_code=403)
        elif not self.user and not self.auth_required:
            self.user = make_user(1)
            self.user.ip_address = self.request.remote_ip

        self.user.refresh(self.sid)

        self.permission_checks()

    # works without touching cookies or headers, primarily used for websocket requests
    def prepare_standalone(self, message_id: str | None = None) -> None:
        self._output = {}
        if message_id != None:
            self.append("message_id", {"message_id": message_id})
        self.setup_output()
        self.arg_parse()
        self.sid_check()
        self.permission_checks()

    def do_rw_session_auth(self) -> bool:
        rw_session_id = self.get_cookie("r4_session_id")
        if rw_session_id:
            user_id = await cursor.fetch_var(
                "SELECT user_id FROM r4_sessions WHERE session_id = %s",
                (rw_session_id,),
            )
            if user_id:
                self.user = make_user(user_id)
                self.user.ip_address = self.request.remote_ip
                self.user.authorize(self.sid, None, bypass=True)
                return True
        return False

    def rainwave_auth(self) -> None:
        user_id_present = "user_id" in self.request.arguments

        if self.auth_required and not user_id_present:
            raise APIException("missing_argument", argument="user_id", http_code=400)
        if user_id_present and not fieldtypes.numeric(self.get_argument("user_id")):
            # do not spit out the user ID back at them, that would create a potential XSS hack
            raise APIException(
                "invalid_argument",
                argument="user_id",
                reason="not numeric.",
                http_code=400,
            )
        if (
            self.auth_required or user_id_present
        ) and not "key" in self.request.arguments:
            raise APIException("missing_argument", argument="key", http_code=400)

        if user_id_present:
            self.user = make_user(int(self.get_argument_int_required("user_id")))
            self.user.ip_address = self.request.remote_ip
            self.user.authorize(self.sid, self.get_argument("key"))
            if not self.user.authorized:
                raise APIException("auth_failed", http_code=403)
            else:
                self._update_phpbb_session(self._get_phpbb_session(self.user.id))

    # Handles adding dictionaries for JSON output
    # Will return a "code" if it exists in the hash passed in, if not, returns True
    def append(self, key: str, dct: Any) -> Any:
        if dct == None:
            return None
        if self._output_array:
            self._output.append({key: dct})  # type: ignore
        else:
            self._output[key] = dct
        if isinstance(dct, dict) and "code" in dct:
            return dct["code"]
        return True

    def append_standard(
        self,
        tl_key: str,
        text: str | None = None,
        success: bool = True,
        return_name: str | None = None,
        **kwargs: Any,
    ) -> None:
        if not text:
            text = self.locale.translate(tl_key, **kwargs)
        kwargs.update({"success": success, "tl_key": tl_key, "text": text})
        if return_name:
            self.append(return_name, kwargs)
        else:
            self.append(self.return_name, kwargs)

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]
            if isinstance(exc, APIException):
                exc.localize(self.locale)
                log.debug("exception", exc.reason)

    def get_sql_limit_string(self) -> str:
        if not self.pagination:
            return ""
        limit = ""
        if self.get_argument("per_page") != None:
            if not self.get_argument("per_page"):
                limit = "LIMIT ALL"
            else:
                limit = "LIMIT %s" % self.get_argument("per_page")
        else:
            limit = "LIMIT 100"
        if self.get_argument("page_start"):
            limit += " OFFSET %s" % self.get_argument("page_start")
        return limit
