import uuid

from api.handler_classes.html_handler import HtmlHandler
from common.db.cursor import get_cursor
from common.user.ensure_api_key import ensure_api_key

ALLOWED_DESTINATIONS: tuple[str, ...] = (
    "web",
    "rw",
    "app",
    "rwpath",
)


class OAuthHandler(HtmlHandler):
    def get_destination(self):
        destination = self.get_argument("destination", "")
        if destination not in ALLOWED_DESTINATIONS:
            destination = "web"
        return destination

    async def setup_rainwave_session_and_redirect(self, user_id: int, destination: str):
        async with get_cursor() as cursor:
            session_id = str(uuid.uuid4())
            await cursor.update(
                "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
                (
                    session_id,
                    user_id,
                ),
            )
            self.set_cookie(
                "r4_session_id", session_id, expires_days=365, httponly=True
            )

            api_key = await ensure_api_key(cursor, user_id)

            if destination == "app" or destination == "rw":
                self.redirect(
                    "rw://%s:%s@rainwave.cc" % (user_id, api_key),
                )
            elif destination == "rwpath":
                self.redirect(
                    "rwpath://rainwave.cc/%s/%s" % (user_id, api_key),
                )
            else:
                self.redirect("/")
