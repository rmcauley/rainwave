from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor
from common.playlist.song.model.song_on_station import (
    SongOnStation,
    SongOnStationNotFoundError,
)
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


@handle_api_url("request")
class SubmitRequest(RegisteredUserAPIHandler):
    sid_required = True
    tunein_required = False
    unlocked_listener_only = False
    description = "Submits a request for a song."
    sync_across_sessions = True

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "request_result"

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4RequestPostRequest)
        async with get_cursor() as cursor:
            try:
                song_on_station = await SongOnStation.load(
                    cursor, input.song_id, self.sid
                )
            except SongOnStationNotFoundError:
                raise APIException("song_does_not_exist")

            await self.user.add_request(cursor, song_on_station)
            self.response["request_result"] = {
                "success": True,
                "tl_key": "request_success",
                "text": self.rainwave_locale.translate("request_success"),
            }
            song_requests = await get_user_requests(cursor, self.sid, self.user.id)
            self.response["requests"] = user_requests_to_api(song_requests)
