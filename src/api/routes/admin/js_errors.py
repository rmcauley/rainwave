from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.helpers.js_error_reports import get_error_reports


@handle_api_url("admin/js_errors")
class JSErrors(APIHandler):
    return_name = "js_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have happened to users using the site."

    async def post(self):
        errors = await get_error_reports()
        self.response["admin_js_errors"] = errors
