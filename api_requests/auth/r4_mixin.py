# type: ignore

### Typing ignored for whole file

import uuid
from libs import db
from rainwave.user import User
from api.web import RainwaveHandler

ALLOWED_DESTINATIONS = ("web", "rw", "app", "rwpath")


class R4SetupSessionMixin:
    def get_destination(self):
        destination = self.get_argument("destination", "web")
        if destination not in ALLOWED_DESTINATIONS:
            destination = "web"
        return destination

    def setup_rainwave_session_and_redirect(self, user_id, destination):
        session_id = str(uuid.uuid4())
        db.c.update(
            "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
            (
                session_id,
                user_id,
            ),
        )
        self.set_cookie("r4_session_id", session_id, expires_days=365)

        if destination == "app" or destination == "rw":
            user = User(user_id)
            user.authorize(1, None, bypass=True)
            self.redirect(
                "rw://%s:%s@rainwave.cc" % (user.id, user.ensure_api_key()),
            )
        elif destination == "rwpath":
            user = User(user_id)
            user.authorize(1, None, bypass=True)
            self.redirect(
                "rwpath://rainwave.cc/%s/%s" % (user.id, user.ensure_api_key()),
            )
        else:
            self.redirect("/")
