from abc import ABC
from typing import cast

from api.handler_classes.api_handler import APIHandler
from common.user.model.registered_user import RegisteredUser


class RegisteredUserAPIHandler(APIHandler, ABC):
    login_required = True
    registered_user: RegisteredUser

    async def prepare(self) -> None:
        await super().prepare()

        # super().prepare() guarantees that registered_user is available
        self.registered_user = cast(RegisteredUser, self.user)
