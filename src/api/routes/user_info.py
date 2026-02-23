@handle_api_url("user_info")
class UserInfoRequest(APIHandler):
    description = (
        "Get information about the user whose ID and API key has been provided."
    )
    auth_required = True
    sid_required = False

    def post(self):
        self.append("user_info", self.user.to_private_dict())
