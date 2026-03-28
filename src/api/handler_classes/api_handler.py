from abc import abstractmethod
from typing import Any

from tornado.concurrent import Future
from api.handler_classes.rainwave_handler import RainwaveHandler


class APIHandler(RainwaveHandler):
    content_type = "application/json"
    sync_across_sessions: bool = False

    @abstractmethod
    async def post(self) -> None:
        raise NotImplementedError()

    def write_error(self, status_code: int, **kwargs: Any) -> None:
        self.response = self.get_json_error_response(status_code, **kwargs)

    def finish(self, chunk: Any = None) -> Future[None]:
        if not self.websocket_handling:
            self._write_rainwave_output()
        return super().finish(chunk)
