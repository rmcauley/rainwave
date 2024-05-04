import tornado
import traceback
from http.client import responses

from libs import db
from libs import config

from api_requests.auth.errors import OAuthRejectedError

from api.exceptions import APIException
from api import locale


def html_write_error(self, status_code, **kwargs):
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

        if status_code == 500 or config.get("developer_mode"):
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
