from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from common import config
from pydantic import BaseModel
from common.db.cursor import get_cursor


class UpdateUserNicknameByDiscordIdPostRequest(BaseModel):
    discord_user_id: str
    nickname: str


@handle_api_url("update_user_nickname_by_discord_id")
class UpdateUserNicknameByDiscordId(APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."

    async def post(self):
        input = self.get_validated_input(UpdateUserNicknameByDiscordIdPostRequest)
        async with get_cursor() as cursor:
            if self.request.remote_ip not in config.api_trusted_ip_addresses:
                raise APIException(
                    "auth_failed",
                    f"{self.request.remote_ip} is not allowed to access this endpoint.",
                )

            discord_user_id = input.discord_user_id
            nickname = input.nickname

            possible_id = await cursor.fetch_var(
                "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
                (discord_user_id,),
                var_type=int,
            )
            if possible_id:
                await cursor.update(
                    """
                    UPDATE phpbb_users
                    SET radio_username = %s
                    WHERE user_id = %s
                    """,
                    (
                        nickname,
                        possible_id,
                    ),
                )
        self.write_rainwave_output()
