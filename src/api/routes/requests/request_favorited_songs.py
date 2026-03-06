from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


@handle_api_url("request_favorited_songs")
class RequestFavoritedSongs(APIHandler):
    description = "Fills the user's request queue with favorited songs."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    fields = {"limit": (fieldtypes.integer, False)}
    sync_across_sessions = True

    async def post(self):
        if self.user.add_favorited_requests(self.sid, input.) > 0:
            self.append_standard("request_favorited_songs_success")
                        self.response["requests"] = self.user.get_requests(self.sid)
        else:
            raise APIException("request_favorited_failed")
