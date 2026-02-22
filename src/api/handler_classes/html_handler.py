from http.client import responses
import traceback
from typing import Any

from tornado.web import HTTPError

from api.exceptions import APIException
from api.handler_classes.rainwave_handler import RainwaveHandler
from api.routes.auth.errors import OAuthRejectedError


class HTMLRequest(RainwaveHandler):
    def write_error(self, status_code: int, **kwargs: Any) -> None:
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
