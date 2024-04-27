from libs import db
import api.web
from api.urls import handle_api_url
from api import fieldtypes
from api.exceptions import APIException
from libs import config


@handle_api_url("update_user_avatar_by_discord_id")
class UpdateUserAvatarByDiscordId(api.web.APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."
    help_hidden = True
    fields = {
        "discord_user_id": (fieldtypes.string, True),
        "avatar": (fieldtypes.string, True),
    }

    def post(self):
        if self.request.remote_ip not in config.get("api_trusted_ip_addresses"):
            raise APIException(
                "auth_failed",
                f"{self.request.remote_ip} is not allowed to access this endpoint.",
            )

        discord_user_id = self.get_argument("discord_user_id")
        avatar = self.get_argument("avatar")
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_user_id}/{avatar}.png?size=320"
        user_avatar_type = "avatar.driver.remote"

        possible_id = db.c.fetch_var(
            "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
            (discord_user_id,),
        )
        if possible_id:
            db.c.update(
                (
                    "UPDATE phpbb_users SET "
                    "  user_avatar_type = %s, "
                    "  user_avatar = %s "
                    "WHERE user_id = %s"
                ),
                (
                    user_avatar_type,
                    avatar_url,
                    possible_id,
                ),
            )

        self.append_standard("yes")
