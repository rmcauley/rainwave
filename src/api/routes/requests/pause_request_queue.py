from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor


@handle_api_url("pause_request_queue")
class PauseRequestQueue(RegisteredUserAPIHandler):
    description = "Stops the user from having their request queue processed while they're listening.  Will remove them from the line."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        async with get_cursor() as cursor:
            await self.user.pause_requests(cursor)
            self.response["user"] = self.user.to_api_with_private_data()
            if self.user.private_data["requests_paused"]:
                self.response["pause_request_queue_result"] = {
                    "success": True,
                    "text": self.rainwave_locale.translate("request_queue_paused"),
                    "tl_key": "request_queue_paused",
                }
            else:
                self.response["pause_request_queue_result"] = {
                    "success": False,
                    "text": self.rainwave_locale.translate("request_queue_unpaused"),
                    "tl_key": "request_queue_unpaused",
                }
