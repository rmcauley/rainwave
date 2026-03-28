from typing import Any

from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from common import config
from common.db.cursor import get_cursor
from pydantic import BaseModel, field_validator

PRIVILEGED_GROUP_IDS = (18, 5, 4)


class EnablePerksByDiscordIdsPostRequest(BaseModel):
    discord_user_ids: list[str]

    @field_validator("discord_user_ids", mode="before")
    @classmethod
    def parse_discord_user_ids(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return value.split(",")
        raise TypeError("discord_user_ids must be a comma-separated string")


@handle_api_url("enable_perks_by_discord_ids")
class UserSearchByDiscordUserIdRequest(APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "enable_perks_by_discord_ids_result"

    async def post(self):
        input = self.get_validated_input(EnablePerksByDiscordIdsPostRequest)
        async with get_cursor() as cursor:
            if self.request.remote_ip not in config.api_trusted_ip_addresses:
                raise APIException(
                    "auth_failed",
                    f"{self.request.remote_ip} is not allowed to access this endpoint.",
                )

            await cursor.update(
                """
                UPDATE phpbb_users
                SET group_id = 8
                WHERE
                    discord_user_id = ANY(%s)
                    AND group_id != 8
                    AND NOT (group_id = ANY(%s))
                """,
                (input.discord_user_ids, list(PRIVILEGED_GROUP_IDS)),
            )
            self.response["enable_perks_by_discord_ids_result"] = {
                "success": True,
                "text": "Processed Discord user IDs.",
                "tl_key": "yes",
            }
