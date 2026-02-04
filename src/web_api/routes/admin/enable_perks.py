from typing import cast
from src.backend.libs import db
import web_api.web
from web_api.urls import handle_api_url
from web_api import fieldtypes
from web_api.exceptions import APIException
from src.backend import config

PRIVILEGED_GROUP_IDS = (18, 5, 4)


@handle_api_url("enable_perks_by_discord_ids")
class UserSearchByDiscordUserIdRequest(web_api.web.APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."
    help_hidden = True
    fields = {"discord_user_ids": (fieldtypes.string_list, True)}

    def post(self):
        if self.request.remote_ip not in config.api_trusted_ip_addresses:
            raise APIException(
                "auth_failed",
                f"{self.request.remote_ip} is not allowed to access this endpoint.",
            )

        list_as_tuple = tuple(cast(list[str], self.get_argument("discord_user_ids")))

        db.c.update(
            "UPDATE phpbb_users SET group_id = 8 WHERE discord_user_id IN %s AND group_id NOT IN %s AND group_id != 8",
            (list_as_tuple, PRIVILEGED_GROUP_IDS),
        )

        self.append_standard("yes")
