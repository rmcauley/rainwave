from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.rainwave_dto import Api4UserSearchPostRequest
from common import config
from common.db.cursor import get_cursor


@handle_api_url("user_search")
class UserSearchRequest(APIHandler):
    description = "Returns a user ID and station they're currently tuned to based on the username provided."
    auth_required = False
    sid_required = False

    async def post(self):
        input = self.get_validated_input(Api4UserSearchPostRequest)
        async with get_cursor() as cursor:
            if self.request.remote_ip not in config.api_trusted_ip_addresses:
                raise APIException(
                    "auth_failed",
                    f"{self.request.remote_ip} is not allowed to access this endpoint.",
                )

            possible_id = await cursor.fetch_var(
                "SELECT user_id FROM phpbb_users WHERE username = %s OR radio_username = %s",
                (input.username, input.username),
                var_type=int,
            )
            if possible_id:
                possible_sid = await cursor.fetch_var(
                    "SELECT sid FROM r4_listeners WHERE user_id = %s",
                    (possible_id,),
                    var_type=int,
                )
                self.response["admin_user_search_result"] = {
                    "user_id": possible_id,
                    "sid": possible_sid,
                }
            else:
                self.response["admin_user_search_result"] = {
                    "user_id": None,
                    "sid": None,
                }
        self.write_rainwave_output()
