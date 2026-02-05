import tornado
import traceback
from http.client import responses
from typing import Any

from backend.libs import db
from backend import config

from routes.auth.errors import OAuthRejectedError

from web_api.exceptions import APIException
from backend.locale import locale


def html_write_error(self, status_code: int, **kwargs: Any) -> None:
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
            if not isinstance(self.locale, locale.RainwaveLocale):
                exc.localize(locale.RainwaveLocale.get("en_CA"))
            else:
                exc.localize(self.locale)

        if isinstance(exc, OAuthRejectedError):
            self.write(
                self.render_string(
                    "basic_header.html", title=self.locale.translate("oauth_rejected")
                )
            )
        elif isinstance(exc, (APIException, tornado.web.HTTPError)) and exc.reason:
            self.write(
                self.render_string(
                    "basic_header.html", title="%s - %s" % (status_code, exc.reason)
                )
            )
        else:
            self.write(
                self.render_string(
                    "basic_header.html",
                    title="HTTP %s - %s"
                    % (
                        status_code,
                        responses.get(status_code, "Unknown"),
                    ),
                )
            )

        if status_code == 500 or config.developer_mode:
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

    self.finish()
