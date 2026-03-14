from api.handle_url import handle_url
from api.handler_classes.html_registered_user_handler import HtmlRegisteredUserHandler
from .keys_index import write_key_index
from common.db.cursor import get_cursor
from common.user.api_key import generate_api_key_and_listen_key


@handle_url("/keys/create")
class KeyCreate(HtmlRegisteredUserHandler):
    async def get(self):
        async with get_cursor() as cursor:
            await generate_api_key_and_listen_key(cursor, self.user.id)
        await write_key_index(self, self.user)
