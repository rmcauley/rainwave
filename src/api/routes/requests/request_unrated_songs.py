from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


@handle_api_url("request_unrated_songs")
class RequestUnratedSongs(RegisteredUserAPIHandler):
    description = "Fills the user's request queue with unrated songs."
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        async with get_cursor() as cursor:
            if await self.user.add_unrated_requests(cursor, self.sid) > 0:
                self.response["request_unrated_songs_result"] = {
                    "success": True,
                    "text": self.rainwave_locale.translate(
                        "request_unrated_songs_success"
                    ),
                    "tl_key": "request_unrated_songs_success",
                }
                song_requests = await get_user_requests(cursor, self.sid, self.user.id)
                self.response["requests"] = user_requests_to_api(song_requests)
            else:
                raise APIException("request_unrated_failed")
