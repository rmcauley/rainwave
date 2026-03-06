from api.exceptions import APIException
from api.handler_classes.auth_required_handler import AuthRequiredAPIHandler
from common.user.model.registered_user import RegisteredUser


class RegisteredUserAPIHandler(AuthRequiredAPIHandler):
    login_required = True
    user: RegisteredUser  # pyright: ignore[reportIncompatibleVariableOverride]

    async def prepare(self) -> None:
        await super().prepare()

        if self.user.id == 1:
            raise APIException("login_required", http_code=403)
