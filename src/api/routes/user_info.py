from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


@handle_api_url("user_info")
class UserInfoRequest(APIHandler):
    description = (
        "Get information about the user whose ID and API key has been provided."
    )
    auth_required = True
    sid_required = False

    async def post(self):
                self.response["user_info"] = self.user.to_private_dict()
        self.write_rainwave_output()
