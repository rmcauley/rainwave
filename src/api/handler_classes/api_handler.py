from abc import abstractmethod
from api.handler_classes.rainwave_handler import RainwaveHandler


class APIHandler(RainwaveHandler):
    content_type = "application/json"

    @abstractmethod
    async def post(self) -> None:
        raise NotImplementedError()
