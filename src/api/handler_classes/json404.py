import orjson
from tornado.web import RequestHandler


class Error404Handler(RequestHandler):
    def get(self) -> None:
        self.post()

    def post(self) -> None:
        self.set_status(404)
        if "in_order" in self.request.arguments:
            self.write("[")
        self.write(
            orjson.dumps({"error": {"tl_key": "http_404", "text": "404 Not Found"}})
        )
        if "in_order" in self.request.arguments:
            self.write("]")
        self.finish()
