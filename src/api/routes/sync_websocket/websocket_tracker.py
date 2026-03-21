import asyncio

from api.rainwave_return_key_to_open_api import RainwaveResponse
from api.routes.sync_websocket.rainwave_websocket_handler import (
    RainwaveWebsocketHandler,
)
from common import log

import datetime
import tornado


class WebsocketTrackerForStation:
    def __init__(self) -> None:
        super().__init__()

        self._websockets_by_user_id: dict[int, set[RainwaveWebsocketHandler]] = {}
        self._websockets_by_listen_key: dict[str, RainwaveWebsocketHandler] = {}

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
        if websocket_to_remove.user_id > 1:
            self._websockets_by_user_id.get(websocket_to_remove.user_id, set()).remove(
                websocket_to_remove
            )
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

    def keep_alive(self):
        for websocket in self:
            try:
                websocket.keep_alive()
            except Exception as e:
                log.exception("sync", "Session failed keepalive.", e)
                try:
                    websocket.rw_finish()
                except Exception as deep_error:
                    log.exception(
                        "sync",
                        "Failed to finish session after failure to keepalive.",
                        deep_error,
                    )
                self.remove(websocket)

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

    def send_to_user(
        self, user_id: int, uuid_exclusion: str, data: RainwaveResponse
    ) -> None:
        if "message_id" in data:
            del data["message_id"]
        for websocket in self.find_registered_user_websockets(user_id):
            if not websocket.uuid == uuid_exclusion:
                websocket.write_rainwave_response(data)

    def send_to_all(self, uuid_exclusion: str, data: RainwaveResponse):
        for websocket in self:
            if not uuid_exclusion == websocket.uuid:
                websocket.write_rainwave_response(data)

    def _throttle_session(self, websocket: RainwaveWebsocketHandler):
        if not websocket in self.throttled:
            self.throttled[websocket] = tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=2),
                lambda: self._do_user_update(websocket),
            )

    def update_registered_user(self, user_id: int):
        # throttle rapid user updates - usually when a user does something like
        # switch relays on their media player this can happen.
        for websocket in self.find_registered_user_websockets(user_id):
            self._throttle_session(websocket)

    def update_anonymous_user_by_listen_key(self, listen_key: str):
        websocket = self.find_anonymous_user_websocket_by_listen_key(listen_key)
        if websocket:
            self._throttle_session(websocket)
