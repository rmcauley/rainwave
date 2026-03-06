from api.handle_url import handle_url
from api.handler_classes.api_handler import APIHandler
from api.routes.keys.keys_index import KeyIndex
from api import fieldtypes
from common.db.cursor import get_cursor


@handle_url("/keys/delete")
class KeyDelete(KeyIndex):
    fields = {"delete_key": (fieldtypes.integer, True)}

    async def get(self):
        async with get_cursor() as cursor:
            await cursor.update(
                "DELETE FROM r4_api_keys WHERE user_id = %s AND api_id = %s",
                (self.user.id, input["delete_key")),
            )
            self.user.get_all_api_keys()
            super().get()
