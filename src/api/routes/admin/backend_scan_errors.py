from time import time as timestamp
from libs import cache
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url


@handle_api_url("admin/backend_scan_errors")
class BackendScanErrors(APIHandler):
    return_name = "backend_scan_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have occurred while scanning music."

    async def post(self):
        errors = cache.get("backend_scan_errors") or [
            {"time": timestamp(), "backend_scan_errors": "No errors in memory."}
        ]
                self.response[self.return_name] = errors
