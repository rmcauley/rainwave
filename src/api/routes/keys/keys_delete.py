from pydantic import BaseModel

from api.handle_url import handle_url
from api.handler_classes.html_registered_user_handler import HtmlRegisteredUserHandler
from api.routes.keys.keys_index import write_key_index
from api import fieldtypes
from common.db.cursor import get_cursor


class DeleteKeyDto(BaseModel):
    delete_key: int


@handle_url("/keys/delete")
class KeyDelete(HtmlRegisteredUserHandler):
    fields = {"delete_key": (fieldtypes.integer, True)}

    async def get(self):
        delete_key = self.get_validated_input(
            DeleteKeyDto,
            {
                "delete_key": fieldtypes.positive_integer(
                    self.get_argument("delete_key", "")
                )
            },
        )
        async with get_cursor() as cursor:
            await cursor.update(
                "DELETE FROM r4_api_keys WHERE user_id = %s AND api_id = %s",
                (self.user.id, delete_key.delete_key),
            )
        await write_key_index(self, self.user)
