from abc import ABC, abstractmethod
from urllib.parse import urlparse

from aiohttp import WebSocketError
import orjson
from tornado.websocket import WebSocketClosedError, WebSocketHandler

from api.rainwave_return_key_to_open_api import RainwaveResponse
from common import config, log


class RainwaveWebsocketHandler(WebSocketHandler, ABC):
    uuid: str
    sid: int
    user_id: int
    listen_key: str

    @abstractmethod
    async def update(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def update_user_data_only(self) -> None:
        raise NotImplementedError

    def write_rainwave_response(self, data: RainwaveResponse) -> None:
        message = orjson.dumps(data)
        try:
            self.write_message(message)
        except WebSocketClosedError:
            self.on_close()
        except WebSocketError as e:
            log.exception("websocket", "WebSocket Error", e)
            # Most important is to make sure the socket gets removed from tracking,
            # so call on_close first just in case close itself throws an exception.
            self.on_close()
            self.close()

    def check_origin(self, origin: str) -> bool:
        if config.websocket_allow_from == "*":
            return True
        parsed_origin = urlparse(origin)
        return parsed_origin.netloc.endswith(config.websocket_allow_from)
