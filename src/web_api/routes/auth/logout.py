from web_api.urls import handle_url
from web_api.web import HTMLRequest
from src.backend import config


@handle_url("/oauth/logout")
class Logout(HTMLRequest):
    auth_required = False
    sid_required = False

    def get(self):
        self.set_cookie("r4_session_id", "")
        phpbb_cookie_name = config.phpbb_cookie_name + "_"
        self.set_cookie(phpbb_cookie_name + "u", "")
        self.set_cookie(config.phpbb_cookie_name + "_sid", "")
        self.set_cookie(config.phpbb_cookie_name + "_k", "")
        self.redirect("/")
