from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor


@handle_api_url("unpause_request_queue")
class UnPauseRequestQueue(RegisteredUserAPIHandler):
    description = "Allows the user's request queue to continue being processed.  Adds the user back to the request line."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "unpause_request_queue_result"

    async def post(self):
        async with get_cursor() as cursor:
            await self.user.unpause_requests(cursor, self.sid)
            self.response["user"] = self.user.to_api_with_private_data()
            if self.user.private_data["requests_paused"]:
                self.response["unpause_request_queue_result"] = {
                    "success": False,
                    "text": self.rainwave_locale.translate("request_queue_paused"),
                    "tl_key": "request_queue_paused",
                }
            else:
                self.response["unpause_request_queue_result"] = {
                    "success": True,
                    "text": self.rainwave_locale.translate("request_queue_unpaused"),
                    "tl_key": "request_queue_unpaused",
                }
