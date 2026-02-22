import os
from typing import Any
from tornado.web import StaticFileHandler, RequestHandler

static_dir = os.path.join(
    os.path.dirname(__file__), "..", "..", "src_frontend", "static"
)

request_classes: list[
    tuple[str, type[StaticFileHandler] | type[RequestHandler], Any]
    | tuple[str, type[StaticFileHandler] | type[RequestHandler]]
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
api_endpoints: dict[str, type[RequestHandler]] = {}


class handle_url:
    def __init__(self, url: str) -> None:
        super().__init__()
        self.url = url

    def __call__(self, cls: type[RequestHandler]) -> type[RequestHandler]:
        global api_endpoints

        request_classes.append((self.url, cls))

        if not getattr(cls, "local_only", False) and not getattr(
            cls, "is_websocket", False
        ):
            api_endpoints[self.url] = cls
        return cls


class handle_api_url(handle_url):
    def __init__(self, url: str) -> None:
        super().__init__("/api4/" + url)


class handle_api_html_url(handle_url):
    def __init__(self, url: str) -> None:
        super().__init__("/pages/" + url)
