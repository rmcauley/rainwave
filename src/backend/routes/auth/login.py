import bcrypt
from web_api.urls import handle_url
from web_api.web import HTMLRequest
from libs import db
from routes.error import APIException
from .r4_mixin import R4SetupSessionMixin


def phpbb_passwd_compare(password: str, db_password: str) -> bool:
    hashed_password = bcrypt.hashpw(
        password.encode(), db_password[:29].encode()
    ).decode("utf-8")
    return db_password == hashed_password


@handle_url("/oauth/login")
class PhpbbAuth(HTMLRequest, R4SetupSessionMixin):
    auth_required = False
    sid_required = False

    def get(self):
        self.render(
            "login.html",
            request=self,
            locale=self.locale,
            destination=self.get_argument("destination", "web"),
        )

    def post(self):
        username = self.get_argument("username")
        password = self.get_argument("password")
        if not username:
            raise APIException("username_required")
        if not password:
            raise APIException("password_required")

        db_entry = db.c.fetch_row(
            "SELECT user_id, user_password, user_login_attempts, discord_user_id FROM phpbb_users WHERE LOWER(username) = %s",
            (username.lower(),),
        )
        if not db_entry:
            raise APIException("login_failed")
        if db_entry["discord_user_id"]:
            raise APIException("login_password_disabled")
        db_password = db_entry["user_password"]
        if not db_password.startswith("$2y$"):
            raise APIException("login_too_old")
        if db_entry["user_login_attempts"] >= 5:
            raise APIException("login_limit")
        if not phpbb_passwd_compare(password, db_password):
            db.c.update(
                "UPDATE phpbb_users SET user_login_attempts = user_login_attempts + 1 WHERE username = %s",
                (username,),
            )
            raise APIException("login_failed")

        # setup/save r4 session
        self.setup_rainwave_session_and_redirect(
            db_entry["user_id"], self.get_destination()
        )
