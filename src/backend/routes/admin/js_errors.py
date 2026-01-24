from libs import cache
import web_api.web
from web_api.urls import handle_api_url


@handle_api_url("admin/backend_scan_errors")
class JSErrors(web_api.web.APIHandler):
    return_name = "js_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have happened to users using the site."

    def post(self):
        errors = cache.get("error_reports") or []
        self.append(self.return_name, errors)
