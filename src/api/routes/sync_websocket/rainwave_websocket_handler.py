from abc import ABC, abstractmethod

from tornado.websocket import WebSocketHandler

from api.rainwave_return_key_to_open_api import RainwaveResponse


class RainwaveWebsocketHandler(WebSocketHandler, ABC):
    uuid: str
    sid: int
    user_id: int
    listen_key: str

    @abstractmethod
    def keep_alive(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def rw_finish(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def update(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def update_user_data_only(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def write_rainwave_response(self, data: RainwaveResponse) -> None:
        raise NotImplementedError
