from time import time as timestamp
import datetime
from libs import db
import web_api.web
from web_api.urls import handle_url

from routes.admin.scan_errors import BackendScanErrors


def relative_time(epoch_time: float) -> str:
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


@handle_url("/admin/album_list/scan_results")
class ScanResults(web_api.web.PrettyPrintAPIMixin, BackendScanErrors):
    dj_preparation = True

    def get(self):  # pylint: disable=E0202
        if not isinstance(self._output, dict):
            raise web_api.web.APIException("internal_error", http_code=500)

        new_results = []
        for row in self._output[self.return_name]:
            if row.get("traceback"):
                row["traceback"] = "\n".join(row["traceback"])
                row["traceback"] = (
                    "<pre style='max-width: 450px; overflow: auto;'>%s</pre>"
                    % row["traceback"]
                )
            else:
                row["traceback"] = " "
            row["time"] = relative_time(row["time"])
            new_results.append(row)
        self._output[self.return_name] = new_results
        super(ScanResults, self).get()


@handle_url("/admin/tools/scan_results")
class LatestSongs(web_api.web.HTMLRequest):
    dj_preparation = True

    def get(self):
        self.write(self.render_string("basic_header.html", title="Latest Songs"))
        self.write(
            "<style type='text/css'>div { margin-bottom: 8px; border-bottom: solid 1px #888; }</style>"
        )
        self.write("<script>\nwindow.top.refresh_all_screens = false;\n</script>")

        for fn in db.c.fetch_list(
            "SELECT song_filename FROM r4_songs ORDER BY song_file_mtime DESC LIMIT 20"
        ):
            self.write("<div>%s</div>" % fn)
        self.write(self.render_string("basic_footer.html"))
