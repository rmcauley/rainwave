# type: ignore

### Typing ignored for whole file

import uuid
from common.libs import db
from common.user.user_model import make_user
from api.web import RainwaveHandler

ALLOWED_DESTINATIONS = ("web", "rw", "app", "rwpath")


class R4SetupSessionMixin:
    def do_rw_session_auth(self) -> bool:
        rw_session_id = self.get_cookie("r4_session_id")
        if rw_session_id:
            user_id = await cursor.fetch_var(
                "SELECT user_id FROM r4_sessions WHERE session_id = %s",
                (rw_session_id,),
            )
            if user_id:
                self.user = make_user(user_id)
                self.user.ip_address = self.request.remote_ip
                self.user.authorize(self.sid, None, bypass=True)
                return True
        return False

    def get_destination(self):
        destination = self.get_argument("destination", "web")
        if destination not in ALLOWED_DESTINATIONS:
            destination = "web"
        return destination

    def setup_rainwave_session_and_redirect(self, user_id, destination):
        session_id = str(uuid.uuid4())
        await cursor.update(
            "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
            (
                session_id,
                user_id,
            ),
        )
        self.set_cookie("r4_session_id", session_id, expires_days=365, httponly=True)

        if destination == "app" or destination == "rw":
            user = make_user(user_id)
            user.authorize(1, None, bypass=True)
            self.redirect(
                "rw://%s:%s@rainwave.cc" % (user.id, user.ensure_api_key()),
            )
        elif destination == "rwpath":
            user = make_user(user_id)
            user.authorize(1, None, bypass=True)
            self.redirect(
                "rwpath://rainwave.cc/%s/%s" % (user.id, user.ensure_api_key()),
            )
        else:
            self.redirect("/")
