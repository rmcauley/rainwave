from api.handle_url import handle_url
from api.handler_classes.html_handler import HtmlHandler


@handle_url("/oauth/logout")
class Logout(HtmlHandler):
    auth_required = False
    sid_required = False

    def get(self):
        self.set_cookie("r4_session_id", "")
        self.redirect("/")
