import os
import tornado.web
import src_backend.routes.help

request_classes = [
    (r"/api4/?", src_backend.routes.help.IndexRequest),
    (r"/api4/help/?", src_backend.routes.help.IndexRequest),
    (r"/api4/help/(.+)", src_backend.routes.help.HelpRequest),
    (
        r"/static/(.*)",
        tornado.web.StaticFileHandler,
        {"path": os.path.join(os.path.dirname(__file__), "..", "static")},
    ),
    (
        r"/beta/static/(.*)",
        tornado.web.StaticFileHandler,
        {"path": os.path.join(os.path.dirname(__file__), "..", "static")},
    ),
    (
        r"/favicon.ico",
        tornado.web.StaticFileHandler,
        {
            "path": os.path.join(
                os.path.dirname(__file__), "..", "static", "favicon.ico"
            )
        },
    ),
]
api_endpoints = {}


class handle_url:
    def __init__(self, url):
        self.url = url

    def __call__(self, cls):
        cls.url = self.url
        request_classes.append((self.url, cls))
        src_backend.routes.help.add_help_class(cls, cls.url)
        global api_endpoints
        if not getattr(cls, "local_only", False) and not getattr(
            cls, "is_websocket", False
        ):
            api_endpoints[cls.url] = cls
        return cls


class handle_api_url(handle_url):
    def __init__(self, url):
        super(handle_api_url, self).__init__("/api4/" + url)


class handle_api_html_url(handle_url):
    def __init__(self, url):
        super(handle_api_html_url, self).__init__("/pages/" + url)
