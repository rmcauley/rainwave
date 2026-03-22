import asyncio

from api.rainwave_return_key_to_open_api import RainwaveResponse
from api.websocket.rainwave_websocket_handler import (
    RainwaveWebsocketHandler,
)
from common import log

import datetime
import tornado

# This throttle timeout is used for e.g. media players tuning in,
# which can trigger rapidly if the user is e.g. scrolling through a playlist
# and rapidly connects/disconnects from the site.
# It is not for live interaction with the site.
# There can be a small race condition where an update maaaaaaay get dropped,
# but these updates behave like signals, they are not sending data to us
# they are telling the WebsocketTracker to have the websocket read from the database.
# So... good enough!
SOCKET_UPDATE_THROTTLE_WINDOW = 1000


class WebsocketTrackerForStation:
    def __init__(self) -> None:
        super().__init__()

        self._websockets_by_user_id: dict[int, set[RainwaveWebsocketHandler]] = {}
        self._websockets_by_listen_key: dict[str, RainwaveWebsocketHandler] = {}
        self._debounced_user_updates: dict[int, object] = {}
        self._debounced_listen_key_updates: dict[str, object] = {}

    def __iter__(self):
        for websockets_for_user in self._websockets_by_user_id.values():
            for websocket in websockets_for_user:
                yield websocket
        for websocket in self._websockets_by_listen_key.values():
            yield websocket

    def append(self, websocket_to_add: RainwaveWebsocketHandler):
        if websocket_to_add.user_id > 1:
            self._websockets_by_user_id.setdefault(websocket_to_add.user_id, set())
            self._websockets_by_user_id[websocket_to_add.user_id].add(websocket_to_add)
        else:
            self._websockets_by_listen_key[websocket_to_add.listen_key] = (
                websocket_to_add
            )

    def remove(self, websocket_to_remove: RainwaveWebsocketHandler):
        user_id = websocket_to_remove.user_id
        if websocket_to_remove.user_id > 1:
            if websocket_to_remove.user_id in self._websockets_by_user_id:
                websockets = self._websockets_by_user_id[user_id]
                if websocket_to_remove in websockets:
                    websockets.remove(websocket_to_remove)
                if len(websockets) == 0:
                    self._websockets_by_user_id.pop(user_id)
        else:
            self._websockets_by_listen_key.pop(websocket_to_remove.listen_key, None)

    def find_registered_user_websockets(
        self, user_id: int
    ) -> set[RainwaveWebsocketHandler]:
        return self._websockets_by_user_id.get(user_id, set())

    def find_anonymous_user_websocket_by_listen_key(
        self, listen_key: str
    ) -> RainwaveWebsocketHandler | None:
        return self._websockets_by_listen_key.get(listen_key, None)

    async def _update_session(self, websocket: RainwaveWebsocketHandler) -> bool:
        try:
            await websocket.update()
            return True
        except Exception as e:
            log.exception("sync_update_all", "Failed to update session.", e)
            try:
                websocket.rw_finish()
            except Exception as deep_error:
                log.exception(
                    "sync_update_all",
                    "Failed to finish session after failure to update.",
                    deep_error,
                )
            self.remove(websocket)
            return False

    async def update_all(self, sid: int):
        session_count = 0
        session_failed_count = 0
        updates = await asyncio.gather(
            *(self._update_session(session) for session in self),
            return_exceptions=True,
        )

        for update_result in updates:
            if update_result is True:
                session_count += 1
            else:
                session_failed_count += 1
        log.debug(
            "sync_update_all",
            "Updated %s sessions (%s failed) for sid %s."
            % (session_count, session_failed_count, sid),
        )

    async def _do_user_update(self, websocket: RainwaveWebsocketHandler) -> None:
        try:
            await websocket.update_user_data_only()
        except Exception as e:
            log.exception("sync", "Session failed to be updated during update_user.", e)
            try:
                websocket.rw_finish()
            except Exception:
                log.exception("sync", "Session failed finish() during update_user.", e)
            self.remove(websocket)

    async def _run_user_updates(self, user_id: int) -> None:
        self._debounced_user_updates.pop(user_id, None)
        await asyncio.gather(
            *(
                self._do_user_update(websocket)
                for websocket in self.find_registered_user_websockets(user_id)
            ),
            return_exceptions=True,
        )

    async def _run_listen_key_update(self, listen_key: str) -> None:
        self._debounced_listen_key_updates.pop(listen_key, None)
        websocket = self.find_anonymous_user_websocket_by_listen_key(listen_key)
        if websocket:
            await self._do_user_update(websocket)

    def send_to_user(
        self, user_id: int, uuid_exclusion: str, data: RainwaveResponse
    ) -> None:
        if "message_id" in data:
            del data["message_id"]
        for websocket in tuple(self.find_registered_user_websockets(user_id)):
            if not websocket.uuid == uuid_exclusion:
                websocket.write_rainwave_response(data)

    def send_to_all(self, uuid_exclusion: str | None, data: RainwaveResponse):
        for websocket in tuple(self):
            if not uuid_exclusion == websocket.uuid:
                websocket.write_rainwave_response(data)

    def update_registered_user(self, user_id: int):
        if not self.find_registered_user_websockets(user_id):
            return
        if self._debounced_user_updates.get(user_id):
            return
        self._debounced_user_updates[
            user_id
        ] = tornado.ioloop.IOLoop.current().add_timeout(
            datetime.timedelta(milliseconds=SOCKET_UPDATE_THROTTLE_WINDOW),
            lambda: asyncio.create_task(self._run_user_updates(user_id)),
        )

    def update_anonymous_user_by_listen_key(self, listen_key: str):
        if not self.find_anonymous_user_websocket_by_listen_key(listen_key):
            return
        if self._debounced_listen_key_updates.get(listen_key):
            return
        self._debounced_listen_key_updates[
            listen_key
        ] = tornado.ioloop.IOLoop.current().add_timeout(
            datetime.timedelta(milliseconds=SOCKET_UPDATE_THROTTLE_WINDOW),
            lambda: asyncio.create_task(self._run_listen_key_update(listen_key)),
        )
