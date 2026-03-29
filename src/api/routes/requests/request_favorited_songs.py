from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


@handle_api_url("request_favorited_songs")
class RequestFavoritedSongs(RegisteredUserAPIHandler):
    description = "Fills the user's request queue with favorited songs."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"limit": (fieldtypes.integer, False)}
    sync_across_sessions = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "request_favorited_songs_result"

    async def post(self):
        async with get_cursor() as cursor:
            if await self.user.add_favorited_requests(cursor, self.sid) > 0:
                self.response["request_favorited_songs_result"] = {
                    "success": True,
                    "text": self.locale.translate("request_favorited_songs_success"),
                    "tl_key": "request_favorited_songs_success",
                }
                song_requests = await get_user_requests(cursor, self.sid, self.user.id)
                self.response["requests"] = user_requests_to_api(song_requests)
            else:
                raise APIException("request_favorited_failed")
