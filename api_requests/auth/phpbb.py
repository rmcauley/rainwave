import bcrypt
from api.urls import handle_url
from api.web import HTMLRequest
from libs import db
from api_requests.error import APIException
from .r4_mixin import R4SetupSessionMixin

@handle_url("/oauth/phpbb")
class PhpbbAuth(HTMLRequest, R4SetupSessionMixin):
    auth_required = False
    sid_required = False

    def get(self):
        pass

    def post(self):
        pass
        # user_ip
        # IP limiting using cache
        # username limiting using cache
        # self.locale.translate("login_limit")

        # username = self.request.arguments.get("username")
        # password = self.request.arguments.get("password")
        # if not username:
        #     raise APIException("username_required")
        # if not password:
        #     raise APIException("password_required")

        # db_entry = db.c.fetch_var("SELECT user_id, user_password, user_ip, user_login_attempts FROM phpbb_users WHERE username = %s", (username,))
        # db_password = db_entry['user_password']
        # if not db_password.startswith("$2y$"):
        #     raise APIException("login_too_old")
        # hashed_password = bcrypt.hashpw(password.encode(), db_password[:29].encode())
        # if db_password != hashed_password:
        #     raise APIException("login_failed")

        # # setup/save r4 session
        # self.setup_rainwave_session(db_entry['user_id'])

        # self.redirect("/")