from typing import Any, cast, Callable
import traceback
import hashlib
from time import time as timestamp
from datetime import datetime
import orjson

import tornado.web
import tornado.httputil

from rainwave.user import User
from rainwave.playlist_objects.song import SongNonExistent

from web_api import fieldtypes
from src.backend.libs import locale
from web_api.exceptions import APIException
from src.backend.config import config
from libs import log
from libs import db
from libs import cache

from web_api.html import html_write_error

# This is the Rainwave API main handling request class.  You'll inherit it in order to handle requests.
# Does a lot of form checking and validation of user/etc.  There's a request class that requires no authentication at the bottom of this module.

# VERY IMPORTANT: YOU MUST DECORATE YOUR CLASSES.

# from api.urls import handle_api_url
# @handle_api_url(...)

# Pass a string there for the URL to handle at /api/[url] and the server will do the rest of the work.


class Error404Handler(tornado.web.RequestHandler):
    def get(self) -> None:
        self.post()

    def post(self) -> None:
        self.set_status(404)
        if "in_order" in self.request.arguments:
            self.write("[")
        self.write(
            orjson.dumps({"error": {"tl_key": "http_404", "text": "404 Not Found"}})
        )
        if "in_order" in self.request.arguments:
            self.write("]")
        self.finish()


class HTMLError404Handler(tornado.web.RequestHandler):
    def get(self) -> None:
        self.post()

    def post(self) -> None:
        self.set_status(404)
        self.write(
            self.render_string("basic_header.html", title="HTTP 404 - File Not Found")
        )
        self.write(
            "<p><a href='https://rainwave.cc' target='_top'>Return to the front page.</a></p>"
        )
        self.write(self.render_string("basic_footer.html"))
        self.finish()


def get_browser_locale(
    handler: tornado.web.RequestHandler, default: str = "en_CA"
) -> locale.RainwaveLocale:
    """Determines the user's locale from ``Accept-Language`` header.  Copied from Tornado, adapted slightly.

    See https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.4
    """
    if "rw_lang" in handler.cookies:
        if locale.RainwaveLocale.exists(handler.cookies["rw_lang"].value):
            return locale.RainwaveLocale.get(handler.cookies["rw_lang"].value)
    if "Accept-Language" in handler.request.headers:
        languages = handler.request.headers["Accept-Language"].split(",")
        locales = []
        for language in languages:
            parts = language.strip().split(";")
            if len(parts) > 1 and parts[1].startswith("q="):
                try:
                    score = float(parts[1][2:])
                except ValueError, TypeError:
                    score = 0.0
            else:
                score = 1.0
            locales.append((parts[0], score))
        if locales:
            locales.sort(key=lambda pair: pair[1], reverse=True)
            codes = [l[0] for l in locales]
            return locale.RainwaveLocale.get_closest(codes)
    return locale.RainwaveLocale.get(default)


class RainwaveHandler(tornado.web.RequestHandler):
    # The following variables can be overridden by you.
    # Fields is a hash with { "form_name" => (fieldtypes.[something], True|False|None) } format, so that automatic form validation can be done for you.  True/False values are for required/optional.
    # A True requirement means it must be present and valid
    # A False requirement means it is optional, but if present, must be valid
    # A None requirement means it is optional, and if present and invalid, will be set to None
    fields = {}
    # This URL variable is setup by the server decorator - DON'T TOUCH IT.
    url = ""
    # Do we need a Rainwave auth key for this request?
    auth_required = True
    # return_name is used for documentation, can be an array.
    # If not inherited, return_key automatically turns into url + "_result".  Useful for simple requests like rate, vote, etc.
    return_name: str | None = None
    # Validate user's tuned in status first.
    tunein_required = False
    # Validate user's logged in status first.
    login_required = False
    # User must be a DJ for the next, current, or history[0] event
    dj_required = False
    # User must have an unused DJ-able event in the future
    dj_preparation = False
    # Validate user is a station administrator.
    admin_required = False
    # Do we need a valid SID as part of the submitted form?
    sid_required = True
    # Description string for documentation.
    description = "Undocumented."
    # Error codes for documentation.
    return_codes = None
    # Restricts requests to config.api_trusted_ip_addresses (presumably 127.0.0.1)
    local_only = False
    # Should the user be free to vote and rate?
    unlocked_listener_only = False
    # Do we allow GET HTTP requests to this URL?  (standard is "no")
    allow_get = False
    # Use phpBB session/token auth?
    phpbb_auth = False
    # Does the user need perks (donor/beta/etc) to see this request/page?
    perks_required = False
    # hide from help, meant really only for things like redirect pages
    help_hidden = False
    # automatically add pagination to an API request.  use self.get_sql_limit_string()!
    pagination = False
    # allow access to station ID 0
    allow_sid_zero = False
    # set to allow from any source
    allow_cors = False
    # sync result across all user's websocket sessions
    sync_across_sessions = False

    user: User
    _output: dict[Any, Any] | list[Any]

    is_pretty_print_html = False
    is_html = False

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        if "websocket" not in kwargs:
            super(RainwaveHandler, self).__init__(*args, **kwargs)
        self.cleaned_args = {}
        self.sid = None
        self._startclock = timestamp()
        self.user = None  # type: ignore
        self._output = None  # type: ignore
        self._output_array = False
        self.mobile = False

    def initialize(self, **kwargs: Any) -> None:
        super(RainwaveHandler, self).initialize(**kwargs)
        if self.pagination:
            self.fields["per_page"] = (fieldtypes.zero_or_greater_integer, False)
            self.fields["page_start"] = (fieldtypes.zero_or_greater_integer, False)

    def set_cookie(self, name: str, value: Any, *args: Any, **kwargs: Any) -> None:
        if isinstance(value, int):
            value = repr(value)
        super(RainwaveHandler, self).set_cookie(
            name, value, *args, secure=True, samesite="lax", **kwargs
        )

    def get_argument(self, name, default=None, **kwargs) -> str | None:
        arg = default
        if name in self.cleaned_args:
            arg = self.cleaned_args[name]
        elif name in self.request.arguments:
            arg = self.request.arguments[name]
            if isinstance(arg, list):
                try:
                    arg = arg[-1]
                except IndexError:
                    arg = default
            if isinstance(arg, bytes):
                arg = arg.decode()
            else:
                arg = str(arg)
        if isinstance(arg, bytes):
            arg = arg.decode("utf-8")
        if isinstance(arg, str):
            return arg.strip()
        return arg

    def get_argument_required(self, name: str, default: Any = None, **kwargs: Any) -> Any:
        result = self.get_argument(name, default, **kwargs)
        if result is None:
            raise APIException("internal_error", http_code=500)
        return result

    def get_argument_int(self, name: str, default: Any = None, **kwargs: Any) -> int | None:
        str_arg = self.get_argument(name, default, **kwargs)
        if not str_arg:
            return None
        return int(str_arg)

    def get_argument_int_required(self, name: str, default: Any = None, **kwargs: Any) -> int:
        result = self.get_argument_int(name, default, **kwargs)
        if result is None:
            raise APIException("internal_error", http_code=500)
        return result

    def get_argument_date(self, name: str, default: Any = None, **kwargs: Any) -> datetime | None:
        dt_arg = self.get_argument(name, default, **kwargs)
        if not dt_arg:
            return None
        return cast(datetime, dt_arg)

    def get_argument_date_required(self, name: str, default: Any = None, **kwargs: Any) -> datetime:
        result = self.get_argument_date(name, default, **kwargs)
        if result is None:
            raise APIException("internal_error", http_code=500)
        return result

    def get_argument_bool(self, name: str, default: Any = None, **kwargs: Any) -> bool | None:
        arg = self.get_argument(name, default, **kwargs)
        if arg == True:
            return True
        if arg == False:
            return False
        return None

    def set_argument(self, name: str, value: Any) -> None:
        self.cleaned_args[name] = value

    def get_browser_locale(self, default: str = "en_CA") -> locale.RainwaveLocale:
        return get_browser_locale(self, default)

    def setup_output(self) -> None:
        if not self.return_name:
            self.return_name = self.url[self.url.rfind("/") + 1 :] + "_result"
        else:
            self.return_name = self.return_name

    def arg_parse(self) -> None:
        for field, field_attribs in self.__class__.fields.items():
            type_cast, required = field_attribs
            parsed = None
            if required and field not in self.request.arguments:
                raise APIException("missing_argument", argument=field, http_code=400)
            elif field in self.request.arguments:
                parsed = type_cast(self.get_argument(field), self)
                if parsed == None and required != None:
                    raise APIException(
                        "invalid_argument",
                        argument=field,
                        reason="%s %s"
                        % (
                            field,
                            getattr(fieldtypes, "%s_error" % type_cast.__name__),
                        ),
                        http_code=400,
                    )
            self.cleaned_args[field] = parsed

        if self.pagination:
            self.cleaned_args["per_page"] = self.cleaned_args["per_page"] or 100
            self.cleaned_args["page_start"] = self.cleaned_args["page_start"] or 0

    def sid_check(self) -> None:
        if self.sid is None and not self.sid_required:
            self.sid = config.default_station
        if self.sid == 0 and self.allow_sid_zero:
            pass
        elif not self.sid in config.station_ids:
            raise APIException("invalid_station_id", http_code=400)

    def permission_checks(self) -> None:
        if (self.login_required or self.admin_required or self.dj_required) and (
            not self.user or self.user.is_anonymous()
        ):
            raise APIException("login_required", http_code=403)
        if self.tunein_required and (not self.user or not self.user.is_tunedin()):
            raise APIException("tunein_required", http_code=403)
        if self.admin_required and (not self.user or not self.user.is_admin()):
            raise APIException("admin_required", http_code=403)
        if self.perks_required and (not self.user or not self.user.has_perks()):
            raise APIException("perks_required", http_code=403)

        if self.unlocked_listener_only and not self.user:
            raise APIException("auth_required", http_code=403)
        elif (
            self.unlocked_listener_only
            and self.user.data["lock"]
            and self.user.data["lock_sid"] != self.sid
        ):
            raise APIException(
                "unlocked_only",
                station=config.station_id_friendly[self.user.data["lock_sid"]],
                lock_counter=self.user.data["lock_counter"],
                http_code=403,
            )

        is_dj = False
        if self.dj_required and not self.user:
            raise APIException("dj_required", http_code=403)
        if self.dj_required and not self.user.is_admin():
            potential_djs = cache.get_station(self.sid, "dj_user_ids")
            if not potential_djs or not self.user.id in potential_djs:
                raise APIException("dj_required", http_code=403)
            is_dj = True
            self.user.data["dj"] = True
        elif self.dj_required and self.user.is_admin():
            is_dj = True
            self.user.data["dj"] = True

        if self.dj_preparation and not is_dj and not self.user.is_admin():
            if not db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_schedule WHERE sched_used = 0 AND sched_dj_user_id = %s",
                (self.user.id,),
            ):
                raise APIException("dj_required", http_code=403)

    # Called by Tornado, allows us to setup our request as we wish. User handling, form validation, etc. take place here.
    def prepare(self) -> None:
        if (
            self.local_only
            and not self.request.remote_ip in config.api_trusted_ip_addresses
        ):
            log.info(
                "api",
                "Rejected %s request from %s, untrusted address."
                % (self.url, self.request.remote_ip),
            )
            raise APIException(
                "rejected", text="You are not coming from a trusted address."
            )

        if self.allow_cors:
            self.set_header("Access-Control-Allow-Origin", "*")
            self.set_header("Access-Control-Max-Age", "600")
            self.set_header("Access-Control-Allow-Credentials", "false")

        if not isinstance(self.locale, locale.RainwaveLocale):
            self.locale = self.get_browser_locale()

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
            self.user = User(1)
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

    def do_phpbb_auth(self) -> bool:
        phpbb_cookie_name = config.phpbb_cookie_name + "_"
        user_id = fieldtypes.integer(self.get_cookie(phpbb_cookie_name + "u", ""))
        if not user_id:
            pass
        else:
            if self._verify_phpbb_session(user_id):
                # update_phpbb_session is done by verify_phpbb_session if successful
                self.user = User(user_id)
                self.user.ip_address = self.request.remote_ip
                self.user.authorize(self.sid, None, bypass=True)
                return True

            if not self.user and self.get_cookie(phpbb_cookie_name + "k"):
                can_login = db.c.fetch_var(
                    "SELECT 1 FROM phpbb_sessions_keys WHERE key_id = %s AND user_id = %s",
                    (
                        hashlib.md5(
                            bytes(
                                str(self.get_cookie(phpbb_cookie_name + "k")), "utf-8"
                            )
                        ).hexdigest(),
                        user_id,
                    ),
                )
                if can_login == 1:
                    self._update_phpbb_session(self._get_phpbb_session(user_id))
                    self.user = User(user_id)
                    self.user.ip_address = self.request.remote_ip
                    self.user.authorize(self.sid, None, bypass=True)
                    return True
        return False

    def _verify_phpbb_session(self, user_id: int | None = None) -> str | None:
        if not user_id and not self.user:
            return None
        if not user_id:
            user_id = self.user.id
        cookie_session = self.get_cookie(config.phpbb_cookie_name + "_sid")
        if cookie_session:
            if cookie_session == db.c.fetch_var(
                "SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s AND session_id = %s",
                (user_id, cookie_session),
            ):
                self._update_phpbb_session(cookie_session)
                return cookie_session
        return None

    def _get_phpbb_session(self, user_id: int | None = None) -> Any:
        return db.c.fetch_var(
            "SELECT session_id FROM phpbb_sessions WHERE session_user_id = %s ORDER BY session_last_visit DESC LIMIT 1",
            (user_id,),
        )

    def _update_phpbb_session(self, session_id: Any) -> None:
        db.c.update(
            "UPDATE phpbb_sessions SET session_last_visit = %s, session_page = %s WHERE session_id = %s",
            (int(timestamp()), "rainwave", session_id),
        )

    def do_rw_session_auth(self) -> bool:
        rw_session_id = self.get_cookie("r4_session_id")
        if rw_session_id:
            user_id = db.c.fetch_var(
                "SELECT user_id FROM r4_sessions WHERE session_id = %s",
                (rw_session_id,),
            )
            if user_id:
                self.user = User(user_id)
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
            self.user = User(int(self.get_argument_int_required("user_id")))
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


class APIHandler(RainwaveHandler):
    content_type = "application/json"

    is_api_handler = True

    def initialize(self, **kwargs: Any) -> None:
        super(APIHandler, self).initialize(**kwargs)
        if self.allow_get and not isinstance(self, PrettyPrintAPIMixin):
            self.get = self.post

    def finish(self, chunk: Any = None) -> None:
        self.set_header("Content-Type", self.content_type)
        self.write_output()
        super(APIHandler, self).finish(chunk)

    def write_output(self) -> None:
        if hasattr(self, "_output"):
            if hasattr(self, "_startclock"):
                exectime = timestamp() - self._startclock
            else:
                exectime = -1
            if exectime > 0.5:
                log.warn(
                    "long_request", "%s took %s to execute!" % (self.url, exectime)
                )
            self.append("api_info", {"exectime": exectime, "time": round(timestamp())})
            self.write(orjson.dumps(self._output))

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        if isinstance(self._output, list):
            self._output = []
        else:
            if self._output and "message_id" in self._output:
                self._output = {
                    "message_id": self._output["message_id"],
                }
                self._output[self.return_name] = {
                    "tl_key": "internal_error",
                    "text": self.locale.translate("internal_error"),
                    "status": 500,
                    "success": False,
                }
            else:
                self._output = {}
        if "exc_info" in kwargs:
            exc = kwargs["exc_info"][1]

            if isinstance(exc, db.connection_errors):
                try:
                    self.append(
                        "error",
                        {
                            "code": 500,
                            "tl_key": "db_error_retry",
                            "text": self.locale.translate("db_error_retry"),
                        },
                    )
                except Exception:
                    self.append(
                        "error",
                        {
                            "code": 500,
                            "tl_key": "db_error_permanent",
                            "text": self.locale.translate("db_error_permanent"),
                        },
                    )
            elif isinstance(exc, APIException):
                exc.localize(self.locale)
                self.append(self.return_name, exc.jsonable())
            elif isinstance(exc, SongNonExistent):
                self.append(
                    "error",
                    {
                        "code": status_code,
                        "tl_key": "song_does_not_exist",
                        "text": self.locale.translate("song_does_not_exist"),
                    },
                )
            else:
                self.append(
                    "error",
                    {
                        "code": status_code,
                        "tl_key": "internal_error",
                        "text": repr(exc),
                    },
                )
                self.append(
                    "traceback",
                    {
                        "traceback": traceback.format_exception(
                            kwargs["exc_info"][0],
                            kwargs["exc_info"][1],
                            kwargs["exc_info"][2],
                        )
                    },
                )
        else:
            self.append(
                "error",
                {
                    "tl_key": "internal_error",
                    "text": self.locale.translate("internal_error"),
                },
            )
        if not kwargs.get("no_finish"):
            self.finish()


class HTMLRequest(RainwaveHandler):
    phpbb_auth = True
    allow_get = True
    write_error = html_write_error
    is_html = True


# this mixin will overwrite anything in APIHandler and RainwaveHandler so be careful wielding it
class PrettyPrintAPIMixin:
    phpbb_auth = True
    allow_get = True
    write_error = html_write_error
    is_html = True
    is_pretty_print_html = True

    # Vars here be filled by the base class, not the mixin
    _output: dict[Any, Any] | list[Any]
    write: Callable
    render_string: Callable
    locale: locale.RainwaveLocale
    return_name: str
    pagination: bool
    fields: dict
    get_argument_int: Callable
    url: str
    get_argument: Callable
    request: tornado.httputil.HTTPServerRequest

    # reset the initialize to ignore overwriting self.get with anything
    def initialize(self, *args: Any, **kwargs: Any) -> None:
        super().initialize(*args, **kwargs)  # type: ignore
        self._real_post = self.post
        self.post = self.post_reject

    def prepare(self) -> None:
        super().prepare()  # type: ignore
        self._real_post()

    def get(self, write_header: bool = True) -> None:
        if not isinstance(self._output, dict):
            raise APIException(
                "invalid_argument",
                "Pretty-printed output of in_order requests is not supported",
                code=400,
            )

        if write_header:
            self.write(
                self.render_string(
                    "basic_header.html", title=self.locale.translate(self.return_name)
                )
            )

        page_start = self.get_argument("page_start")
        per_page = self.get_argument("per_page")
        per_page_link = None
        previous_page_start = None
        next_page_start = None
        if self.pagination:
            if self.get_argument_int("page_start"):
                previous_page_start = min(page_start - per_page, 0)
                next_page_start = page_start + per_page
            else:
                next_page_start = per_page

            per_page_link = "%s?" % self.url
            for field in self.fields.keys():
                if field == "page_start":
                    pass
                elif field == "per_page":
                    per_page_link += "%s=%s&" % (field, per_page)
                else:
                    per_page_link += "%s=%s&" % (field, self.get_argument(field))

            if page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                self.return_name in self._output
                and len(self._output[self.return_name]) >= per_page
            ):
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
            elif not self.return_name in self._output:
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )

        for json_out in self._output.values():
            if not isinstance(json_out, list):
                continue
            if len(json_out) > 0:
                self.write("<table class='%s'><th>#</th>" % self.return_name)
                keys = getattr(self, "columns", self.sort_keys(json_out[0].keys()))
                for key in keys:
                    self.write("<th>%s</th>" % self.locale.translate(key))
                self.header_special()
                self.write("</th>")
                i = 1
                if "page_start" in self.request.arguments:
                    i += self.get_argument("page_start")
                for row in json_out:
                    self.write("<tr><td>%s</td>" % i)
                    for key in keys:
                        if key == "sid":
                            self.write(
                                "<td>%s</td>" % config.station_id_friendly[row[key]]
                            )
                        else:
                            self.write("<td>%s</td>" % row[key])
                    self.row_special(row)
                    self.write("</tr>")
                    i = i + 1
                self.write("</table>")
            else:
                self.write("<p>%s</p>" % self.locale.translate("no_results"))

        if self.pagination:
            if page_start > 0:
                self.write(
                    "<div><a href='%spage_start=%s'>&lt;&lt; Previous Page</a></div>"
                    % (per_page_link, previous_page_start)
                )
            if (
                self.return_name in self._output
                and len(self._output[self.return_name]) >= per_page
            ):
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
            elif not self.return_name in self._output:
                self.write(
                    "<div><a href='%spage_start=%s'>Next Page &gt;&gt;</a></div>"
                    % (per_page_link, next_page_start)
                )
        self.write(self.render_string("basic_footer.html"))

    def header_special(self) -> None:
        pass

    def row_special(self, row: dict[str, Any]) -> None:
        pass

    def sort_keys(self, keys: list[str] | Any) -> list[str]:
        new_keys = []
        for key in ["rating_user", "fave", "title", "album_rating_user", "album_name"]:
            if key in keys:
                new_keys.append(key)
        new_keys.extend(key for key in keys if key not in new_keys)
        return new_keys

    # pylint: disable=E1003
    # no JSON output!!
    def finish(self, *args, **kwargs):
        super(APIHandler, self).finish(*args, **kwargs)  # type: ignore

    # pylint: enable=E1003

    # see initialize, this will override the JSON POST function
    def post_reject(self):
        return None
