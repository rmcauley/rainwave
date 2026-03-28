from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.rainwave_dto import Api4UpdateUserAvatarByDiscordIdPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common import config
from common.db.cursor import get_cursor


@handle_api_url("update_user_avatar_by_discord_id")
class UpdateUserAvatarByDiscordId(APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "update_user_avatar_by_discord_id_result"

    async def post(self):
        input = self.get_validated_input(Api4UpdateUserAvatarByDiscordIdPostRequest)
        async with get_cursor() as cursor:
            if self.request.remote_ip not in config.api_trusted_ip_addresses:
                raise APIException(
                    "auth_failed",
                    f"{self.request.remote_ip} is not allowed to access this endpoint.",
                )

            discord_user_id = input.discord_user_id
            avatar_url = input.avatar
            user_avatar_type = "avatar.driver.remote"

            possible_id = await cursor.fetch_var(
                "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
                (discord_user_id,),
                var_type=int,
            )
            if possible_id:
                await cursor.update(
                    (
                        """
                        UPDATE phpbb_users
                        SET user_avatar_type = %s,
                            user_avatar = %s
                        WHERE user_id = %s
                        """
                    ),
                    (
                        user_avatar_type,
                        avatar_url,
                        possible_id,
                    ),
                )
            self.response["update_user_avatar_by_discord_id_result"] = {
                "success": True,
                "text": "User avatar processed.",
                "tl_key": "yes",
            }
