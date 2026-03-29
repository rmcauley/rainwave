from api.handle_url import handle_api_url
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.helpers.user_to_api_private import user_to_api_private


@handle_api_url("user_info")
class UserInfoRequest(AuthRequiredAPIHandler):
    description = (
        "Get information about the user whose ID and API key has been provided."
    )
    sid_required = False

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "user_info"

    async def post(self):
        self.response["user_info"] = user_to_api_private(self.user)
