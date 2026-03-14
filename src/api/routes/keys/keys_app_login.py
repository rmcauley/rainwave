from api.handle_url import handle_url
from api.handler_classes.html_registered_user_handler import HtmlRegisteredUserHandler
from common.db.cursor import get_cursor
from common.user.api_key import generate_api_key_and_listen_key


@handle_url("/keys/app")
class AppLogin(HtmlRegisteredUserHandler):
    login_required = False
    sid_required = False
    auth_required = False
    description = "Shows an acceptance screen with an rw:// link to login.  Allows seamless logins on mobile screens."

    async def get(self):
        async with get_cursor() as cursor:
            key = await cursor.fetch_var(
                "SELECT api_key FROM r4_api_keys WHERE user_id = %s LIMIT 1",
                (self.user.id,),
                var_type=str,
            )

            if not key:
                (key, _listen_key) = await generate_api_key_and_listen_key(
                    cursor, self.user.id
                )

            self.render(
                "applogin.html",
                request=self,
                locale=self.locale,
                link_url="rw://%s:%s@rainwave.cc" % (self.user.id, key),
            )
