from time import time as timestamp
from typing import TypedDict

from pydantic import BaseModel
import pydantic

from api import fieldtypes
from api.handle_url import handle_api_url

from api.routes.listener_detection.icecast_handler import IcecastHandler
from common.zeromq import sync_to_front
from common.db.cursor import get_cursor


class RemoveListenerDTO(BaseModel):
    client: int


class ListenerRow(TypedDict):
    user_id: int
    listener_key: str


# Sample Icecast query:
# &server=myserver.com&port=8000&client=1&mount=/live&user=&pass=&ip=127.0.0.1&agent="My%20player"


@handle_api_url("listener_remove")
class RemoveListener(IcecastHandler):
    fields = {
        "client": (fieldtypes.integer, True),
    }

    async def post(self):
        try:
            input = RemoveListenerDTO.model_validate(
                {"client": self.get_argument("client")}
            )
        except pydantic.ValidationError:
            self.write("Invalid Icecast request")
            return
        async with get_cursor() as cursor:
            listener = await cursor.fetch_row(
                """
                UPDATE r4_listeners 
                SET listener_purge = TRUE 
                WHERE listener_relay = %s AND listener_icecast_id = %s
                RETURNING user_id, listener_key
                """,
                (self.relay, input.client),
                row_type=ListenerRow,
            )
            if not listener:
                return

            await cursor.update(
                "UPDATE r4_listeners SET listener_purge = TRUE WHERE listener_relay = %s AND listener_icecast_id = %s",
                (self.relay, input.client),
            )
            if listener["user_id"] > 1:
                await cursor.update(
                    "UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s",
                    (timestamp() + 600, listener["user_id"]),
                )
                sync_to_front.sync_frontend_user_id(listener["user_id"])
            else:
                sync_to_front.sync_frontend_key(listener["listener_key"])
            self.failed = False
