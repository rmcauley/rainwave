from web_api.web import HTMLRequest
from web_api.urls import handle_url


@handle_url("/oauth/tos_privacy")
class RainwaveTOSPrivacy(HTMLRequest):
    def get(self):
        self.write(
            self.render_string("bare_header.html", title="Rainwave TOS and Privacy")
        )
        self.write(self.render_string("tos_privacy.html"))
        self.write(self.render_string("basic_footer.html"))
