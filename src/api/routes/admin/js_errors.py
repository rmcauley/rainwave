from libs import cache
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url


@handle_api_url("admin/js_errors")
class JSErrors(APIHandler):
    return_name = "js_errors"
    admin_required = True
    sid_required = False
    description = "A list of errors that have happened to users using the site."

    async def post(self):
        errors = cache.get("error_reports") or []
                self.response[self.return_name] = errors
