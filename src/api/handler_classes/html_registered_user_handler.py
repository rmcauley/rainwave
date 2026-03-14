from typing import cast

import tornado

from api.handler_classes.html_handler import HtmlHandler
from common.user.model.registered_user import RegisteredUser


class HtmlRegisteredUserHandler(HtmlHandler):
    user: RegisteredUser

    async def prepare(self) -> None:
        await super().prepare()

        if not self.optional_user or self.optional_user.is_anonymous():
            self.redirect("/oauth/login&redirect=%s" % self.request.uri)
            raise tornado.web.Finish()

        self.user = cast(RegisteredUser, self.optional_user)
