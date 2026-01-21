from libs import db
import api_web.web
from api_web.urls import handle_api_url
from api_web import fieldtypes
from api_web.exceptions import APIException
from src_backend.config import config


@handle_api_url("update_user_nickname_by_discord_id")
class UpdateUserNicknameByDiscordId(api_web.web.APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."
    help_hidden = True
    fields = {
        "discord_user_id": (fieldtypes.string, True),
        "nickname": (fieldtypes.string, True),
    }

    def post(self):
        if self.request.remote_ip not in config.get("api_trusted_ip_addresses"):
            raise APIException(
                "auth_failed",
                f"{self.request.remote_ip} is not allowed to access this endpoint.",
            )

        discord_user_id = self.get_argument("discord_user_id")
        nickname = self.get_argument("nickname")

        possible_id = db.c.fetch_var(
            "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
            (discord_user_id,),
        )
        if possible_id:
            db.c.update(
                (
                    "UPDATE phpbb_users SET "
                    "  radio_username = %s "
                    "WHERE user_id = %s"
                ),
                (
                    nickname,
                    possible_id,
                ),
            )

        self.append_standard("yes")
