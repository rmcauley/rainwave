import bcrypt
from api.urls import handle_url
from api.web import HTMLRequest
from libs import db
from api_requests.error import APIException
from .r4_mixin import R4SetupSessionMixin

@handle_url("/oauth/login")
class PhpbbAuth(HTMLRequest, R4SetupSessionMixin):
    auth_required = False
    sid_required = False

    def get(self):
        destination = "web"
        try:
            request_destination = self.request.query_arguments.get("destination", [])[0]
            if request_destination == b"app":
                destination = "app"
        except IndexError:
            pass
        self.render(
            "login.html",
            request=self,
            locale=self.locale,
            destination=destination
        )

    def post(self):
        self.locale.translate("login_limit")

        username = self.request.arguments.get("username")
        password = self.request.arguments.get("password")
        if not username:
            raise APIException("username_required")
        if not password:
            raise APIException("password_required")

        db_entry = db.c.fetch_var("SELECT user_id, user_password, user_login_attempts FROM phpbb_users WHERE username = %s", (username,))
        db_password = db_entry['user_password']
        if not db_password.startswith("$2y$"):
            raise APIException("login_too_old")
        if db_entry["user_login_attempts"] >= 5:
            raise APIException("login_limit")
        hashed_password = bcrypt.hashpw(password.encode(), db_password[:29].encode())
        if db_password != hashed_password:
            db.c.update("UPDATE phpbb_users SET user_login_attempts = user_login_attempts + 1 WHERE username = %s", (username,))
            raise APIException("login_failed")

        # setup/save r4 session
        self.setup_rainwave_session(db_entry['user_id'])

        if self.request.arguments.get("destination") == "app":
            key = db.c.fetch_var(
                "SELECT api_key FROM r4_api_keys WHERE user_id = %s LIMIT 1",
                (db_entry['user_id'],),
            )
            self.redirect("rw://%s:%s@rainwave.cc" % (self.user.id, key),)
        else:
            self.redirect("/")
