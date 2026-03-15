from api.handler_classes.html_handler import HtmlHandler
from api.handle_url import handle_url


@handle_url("/oauth/tos_privacy")
class RainwaveTOSPrivacy(HtmlHandler):
    def get(self):
        self.write(
            self.render_string("bare_header.html", title="Rainwave TOS and Privacy")
        )
        self.write(self.render_string("tos_privacy.html"))
        self.write(self.render_string("basic_footer.html"))
