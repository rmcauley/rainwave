import os
from typing import Any
from tornado.web import StaticFileHandler, RequestHandler

from api.handler_classes.api_handler import APIHandler
from common import config

static_dir = os.path.join(
    os.path.dirname(__file__), "..", "..", "src_frontend", "static"
)

request_classes: list[
    tuple[str, type[StaticFileHandler] | type[RequestHandler] | type[APIHandler], Any]
    | tuple[str, type[StaticFileHandler] | type[RequestHandler] | type[APIHandler]]
] = [
    (
        r"/static/(.*)",
        StaticFileHandler,
        {"path": static_dir},
    ),
    (
        r"/favicon.ico",
        StaticFileHandler,
        {"path": os.path.join(static_dir, "favicon.ico")},
    ),
]
api_endpoints: dict[str, type[RequestHandler] | type[APIHandler]] = {}


class handle_url:
    def __init__(self, url: str) -> None:
        super().__init__()
        self.url = url

    def __call__(
        self, cls: type[RequestHandler], test_mode_only: bool = False
    ) -> type[RequestHandler]:
        global api_endpoints

        if test_mode_only and not config.developer_mode:
            return cls

        request_classes.append((self.url, cls))

        if not getattr(cls, "local_only", False):
            api_endpoints[self.url] = cls
        return cls


class handle_api_url(handle_url):
    def __init__(self, url: str) -> None:
        super().__init__("/api4/" + url)


class handle_api_html_url(handle_url):
    def __init__(self, url: str) -> None:
        super().__init__("/pages/" + url)
