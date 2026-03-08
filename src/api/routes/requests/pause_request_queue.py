from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


@handle_api_url("pause_request_queue")
class PauseRequestQueue(APIHandler):
    description = "Stops the user from having their request queue processed while they're listening.  Will remove them from the line."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        self.user.pause_requests()
        self.response["user"] = self.user.to_private_dict()
        if self.user.data["requests_paused"]:
            self.append_standard("request_queue_paused")
        else:
            self.append_standard("request_queue_unpaused")
