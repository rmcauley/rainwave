from time import time as timestamp
from libs import cache
import web_api.web
from web_api.urls import handle_api_url


@handle_api_url("admin/backend_scan_errors")
class BackendScanErrors(web_api.web.APIHandler):
    return_name = "backend_scan_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have occurred while scanning music."

    def post(self):
        errors = cache.get("backend_scan_errors") or [
            {"time": timestamp(), "backend_scan_errors": "No errors in memory."}
        ]
        self.append(self.return_name, errors)
