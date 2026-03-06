from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url


@handle_api_url("clear_requests")
class ClearRequests(APIHandler):
    description = "Clears all requests from the user's queue."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        self.user.clear_all_requests()
                self.response["requests"] = self.user.get_requests(self.sid)
