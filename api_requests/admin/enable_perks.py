from libs import db
import api.web
from api.urls import handle_api_url
from api import fieldtypes
from api.exceptions import APIException
from libs import config

@handle_api_url("enable_perks_by_discord_ids")
class UserSearchByDiscordUserIdRequest(api.web.APIHandler):
    auth_required = False
    sid_required = False
    description = "Accessible only to localhost connections, for wormgas."
    help_hidden = True
    fields = {"discord_user_ids": (fieldtypes.string_list, True)}

    def post(self):
        if self.request.remote_ip not in config.get("api_trusted_ip_addresses"):
            raise APIException("auth_failed", f"{self.request.remote_ip} is not allowed to access this endpoint.")

        for discord_user_id in self.get_argument("discord_user_ids"):
          possible_id = db.c.fetch_var(
              "SELECT user_id FROM phpbb_users WHERE discord_user_id = %s",
              (discord_user_id,),
          )
          if possible_id:
              db.c.update("UPDATE phpbb_users SET group_id = 5 WHERE user_id = %s", (possible_id,))

        self.append_standard("yes")
