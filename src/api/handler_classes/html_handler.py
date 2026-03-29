from api.handler_classes.rainwave_handler import RainwaveHandler
from api.rainwave_return_key_to_open_api import RainwaveResponseKey


class HtmlHandler(RainwaveHandler):
    content_type = "text/html"

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "error"
