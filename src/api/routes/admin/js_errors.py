from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.helpers.js_error_reports import get_error_reports

@handle_api_url("admin/js_errors")
class JSErrors(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_js_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have happened to users using the site."

    async def post(self):
        self.response["admin_js_errors"] = await get_error_reports()
