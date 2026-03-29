from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


@handle_api_url("clear_requests_on_cooldown")
class ClearRequestsOnCooldown(RegisteredUserAPIHandler):
    description = "Clears all requests from the user's queue that are on a cooldown of 20 minutes or more."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "requests"

    async def post(self):
        async with get_cursor() as cursor:
            await self.user.clear_all_requests_on_cooldown(cursor)
            song_requests = await get_user_requests(cursor, self.sid, self.user.id)
            self.response["requests"] = user_requests_to_api(song_requests)
