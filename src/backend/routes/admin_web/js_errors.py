from time import time as timestamp
import datetime
import tornado.escape
from pytz import timezone

import web_api.web
from web_api.urls import handle_url

from routes.admin.js_errors import JSErrors


def relative_time(epoch_time):
    diff = datetime.timedelta(seconds=timestamp() - epoch_time)
    if diff.days > 0:
        return "%sd" % diff.days
    elif diff.seconds > 3600:
        return "%shr" % int(diff.seconds / 3600)
    elif diff.seconds > 60:
        return "%sm" % int(diff.seconds / 60)
    elif diff.seconds > 0:
        return "%ss" % diff.seconds
    return "now"


@handle_url("/admin/album_list/js_errors")
class JSErrorDisplay(web_api.web.PrettyPrintAPIMixin, JSErrors):
    columns = [
        "user_id",
        "username",
        "time",
        "message",
        "location",
        "lineNumber",
        "columnNumber",
        "user_agent",
        "browser_language",
        "stack",
    ]

    def get(self):  # pylint: disable=E0202,W0221
        if not isinstance(self._output, dict):
            raise web_api.web.APIException("internal_error", http_code=500)
        for row in self._output[self.return_name]:
            row["time"] = row.get("time", None)
            if "stack" in row and row["stack"]:
                if isinstance(row["stack"], list):
                    row["stack"] = "\n".join(row["stack"])
                row["stack"] = (
                    "<pre style='max-width: 450px; overflow: auto;'>%s</pre>"
                    % tornado.escape.xhtml_escape(row["stack"])
                )
            if "time" in row and row["time"]:
                row["time"] = datetime.datetime.fromtimestamp(
                    row["time"], timezone("Asia/Tokyo")
                ).strftime("%a %b %d/%Y %H:%M")
            else:
                row["stack"] = " "
        super(JSErrorDisplay, self).get()


@handle_url("/admin/tools/js_errors")
class JSErrorsDummy(web_api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(self.render_string("basic_header.html", title="Latest Songs"))
        self.write(self.render_string("basic_footer.html"))
