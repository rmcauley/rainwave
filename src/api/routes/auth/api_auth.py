from api import rainwave_dto
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common.db.cursor import get_cursor
from common.user.get_anonymous_user import get_authorized_anonymous_user
from common.user.get_registered_user import get_authorized_registered_user


@handle_api_url("auth")
class WebsocketAuth(APIHandler):
    auth_required = False
    sid_required = False
    description = "Authenticate a websocket session."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "wserror"

    async def prepare(self) -> None:
        # Do not perform normal preparation for this response.
        # We're going to skip all the auth and checks.
        pass

    async def post(self) -> None:
        if not self.websocket_handling or not self.websocket_remote_ip:
            raise APIException("auth_required", status_code=403)

        input = self.get_validated_input(
            rainwave_dto.Api4AuthPostRequest, self.websocket_message
        )

        async with get_cursor() as cursor:
            if input.user_id > 1:
                self.optional_user = await get_authorized_registered_user(
                    cursor,
                    self.sid,
                    input.user_id,
                    input.key,
                    self.websocket_remote_ip,
                )
            else:
                self.optional_user = await get_authorized_anonymous_user(
                    cursor, self.sid, 1, input.key, self.websocket_remote_ip
                )
            self.response["wsok"] = True
