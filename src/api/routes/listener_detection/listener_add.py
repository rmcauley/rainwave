from typing import TypedDict

from pydantic import BaseModel, IPvAnyAddress
import pydantic

from api.routes.listener_detection.parse_icecast_mount import (
    InvalidIcecastMount,
    parse_icecast_mount,
)
from common.db.build_insert import build_insert, build_insert_on_conflict_do_update
from common.db.cursor import get_cursor

from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.routes.listener_detection.icecast_handler import IcecastHandler
from common.user.get_registered_user import get_authorized_registered_user
from common.zeromq import sync_to_front


class AddListenerDTO(BaseModel):
    client: int
    mount: str
    ip: IPvAnyAddress


class ListenKeyApiKeyUserLookup(TypedDict):
    radio_listenkey: str
    api_key: str


@handle_api_url(r"listener_add/(\d+)")
class AddListener(IcecastHandler):
    async def post(self, sid: str | int):
        try:
            input = AddListenerDTO.model_validate(self.request.arguments)
            (_mount, user_id, listen_key, listener_ip) = parse_icecast_mount(
                input.mount
            )
        except (pydantic.ValidationError, InvalidIcecastMount):
            self.write("Invalid Icecast request")
            return

        if listener_ip is None:
            listener_ip = self.get_argument("ip")

        if sid:
            try:
                sid = int(sid)
            except ValueError:
                raise APIException("invalid_station_id", http_code=400)
        else:
            raise APIException("invalid_station_id", http_code=400)
        if user_id > 1 and listen_key:
            await self.add_registered(
                sid, user_id, listen_key, listener_ip, input.client
            )
        elif listen_key:
            await self.add_anonymous(sid, listen_key, listener_ip, input.client)

    async def add_registered(
        self,
        user_id: int,
        sid: int,
        listen_key: str,
        listener_ip: str,
        icecast_client_id: int,
    ):
        async with get_cursor() as cursor:
            user_lookup = await cursor.fetch_row(
                "SELECT radio_listenkey, api_key FROM phpbb_users JOIN r4_api_keys USING (user_id) WHERE phpbb_users.user_id = %s LIMIT 1",
                (user_id,),
                row_type=ListenKeyApiKeyUserLookup,
            )
            if not user_lookup or user_lookup["radio_listenkey"] != listen_key:
                raise APIException("invalid_argument", reason="mismatched listen_key.")
            to_upsert = {
                "sid": sid,
                "user_id": user_id,
                "listener_icecast_id": icecast_client_id,
                "listener_ip": listener_ip,
                "listener_purge": False,
                "listener_relay": self.relay,
            }
            await cursor.update(
                build_insert_on_conflict_do_update(
                    "r4_listeners", list(to_upsert.keys())
                ),
                to_upsert,
            )
            self.failed = False
            user = await get_authorized_registered_user(
                cursor,
                sid,
                user_id,
                user_lookup["api_key"],
                listener_ip,
            )
            await user.put_in_request_line_if_necessary(cursor, sid)
            sync_to_front.sync_frontend_user_id(user_id)

    async def add_anonymous(
        self, sid: int, listen_key: str, listener_ip: str, icecast_client_id: int
    ):
        async with get_cursor() as cursor:
            records = await cursor.fetch_list(
                "SELECT listener_id FROM r4_listeners WHERE (listener_ip = %s OR listener_key = %s) AND user_id = 1",
                (listener_ip, listen_key),
                row_type=int,
            )
            if len(records) == 0:
                to_insert = {
                    "sid": sid,
                    "user_id": 1,
                    "listener_ip": listener_ip,
                    "listener_key": listen_key,
                    "listener_icecast_id": icecast_client_id,
                    "listener_relay": self.relay,
                }
                await cursor.update(
                    build_insert("r4_listeners", list(to_insert.keys())), to_insert
                )
                self.failed = False
            else:
                # Keep one valid entry on file for the listener by popping once
                listener_id = records.pop()
                if len(records) > 0:
                    await cursor.update(
                        "DELETE FROM r4_listeners WHERE listener_id = ANY(%s::int[])",
                        (records,),
                    )
                await cursor.update(
                    """
                    UPDATE r4_listeners 
                    SET sid = %s, listener_ip = %s, listener_relay = %s, listener_icecast_id = %s, listener_key = %s, listener_purge = FALSE 
                    WHERE listener_id = %s
                    """,
                    (
                        sid,
                        listener_ip,
                        self.relay,
                        icecast_client_id,
                        listen_key,
                        listener_id,
                    ),
                )
                self.failed = False
            sync_to_front.sync_frontend_key(listen_key)
