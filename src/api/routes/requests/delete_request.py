from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


@handle_api_url("delete_request")
class DeleteRequest(RegisteredUserAPIHandler):
    description = "Removes a request from the user's queue."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "delete_request_result"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4DeleteRequestPostRequest)
        async with get_cursor() as cursor:
            if await self.user.remove_request(cursor, input.song_id):
                self.response["delete_request_result"] = {
                    "success": True,
                    "text": self.rainwave_locale.translate("request_deleted"),
                    "tl_key": "request_deleted",
                }
                song_requests = await get_user_requests(cursor, self.sid, self.user.id)
                self.response["requests"] = user_requests_to_api(song_requests)
            else:
                raise APIException("request_delete_failed")
