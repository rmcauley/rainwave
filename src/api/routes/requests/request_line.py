from api.handle_url import handle_api_html_url, handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.requests.get_request_line_api import get_request_line_api


@handle_api_url("request_line")
class ListRequestLine(RegisteredUserAPIHandler):
    description = "Gives a list of who is waiting in line to make a request on the given station, plus their current top-requested song. (or no song, if they have not decided)"
    sid_required = True

    async def post(self):
        self.response["request_line"] = await get_request_line_api(self.sid)


@handle_api_html_url("request_line")
class ListRequestLineHTML(ListRequestLine):
    pretty_print_html = True
