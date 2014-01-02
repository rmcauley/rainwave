import time
from libs import cache
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes

@handle_api_url("admin/backend_scan_errors")
class BackendScanErrors(api.web.APIHandler):
	return_name = "backend_scan_errors"
	admin_required = True
	sid_required = False
	description = "A list of errors that have occurred while scanning music."

	def post(self):
		errors = cache.get("backend_scan_errors") or [ { "time": time.time(), "nothing": "No errors in memory." } ]
		self.append(self.return_name, errors)