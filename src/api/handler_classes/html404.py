from tornado.web import RequestHandler


class HTMLError404Handler(RequestHandler):
    def get(self) -> None:
        self.post()

    def post(self) -> None:
        self.set_status(404)
        self.write(
            self.render_string("basic_header.html", title="HTTP 404 - File Not Found")
        )
        self.write(
            "<p><a href='https://rainwave.cc' target='_top'>Return to the front page.</a></p>"
        )
        self.write(self.render_string("basic_footer.html"))
        self.finish()
