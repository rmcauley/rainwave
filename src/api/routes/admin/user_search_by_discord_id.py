from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from common import config
from common.libs import db
from common.db.cursor import get_cursor


@handle_api_url("user_search_by_discord_user_id")
class UserSearchByDiscordUserIdRequest(APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."
    help_hidden = True
    fields = {"discord_user_id": (fieldtypes.string, True)}

    async def post(self):
        async with get_cursor() as cursor:
            if self.request.remote_ip not in config.api_trusted_ip_addresses:
                raise APIException(
                    "auth_failed",
                    f"{self.request.remote_ip} is not allowed to access this endpoint.",
                )

            possible_id = await cursor.fetch_var(
                "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
                (input["discord_user_id"),),
            )
            if possible_id:
                possible_sid = await cursor.fetch_var(
                    "SELECT sid FROM r4_listeners WHERE user_id = %s", (possible_id,)
                )
                            self.response["user"] = {"user_id": possible_id, "sid": possible_sid}
            else:
                            self.response["user"] = {"user_id": None, "sid": None}
