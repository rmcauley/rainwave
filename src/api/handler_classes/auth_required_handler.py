from api.exceptions import APIException
from api.handler_classes.api_handler import APIHandler
from common.user.model.user_base import UserBase


class AuthRequiredAPIHandler(APIHandler):
    auth_required = True
    user: UserBase

    async def prepare(self) -> None:
        await super().prepare()

        if not self.optional_user:
            raise APIException("auth_required", http_code=403)

        self.user = self.optional_user
