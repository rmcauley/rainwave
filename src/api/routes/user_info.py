from api.handle_url import handle_api_url
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from api.helpers.user_to_api_private import user_to_api_private


@handle_api_url("user_info")
class UserInfoRequest(AuthRequiredAPIHandler):
    description = (
        "Get information about the user whose ID and API key has been provided."
    )
    sid_required = False

    async def post(self):
        self.response["user_info"] = user_to_api_private(self.user)
        self.write_rainwave_output()
