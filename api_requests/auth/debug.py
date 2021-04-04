from api.urls import handle_url
from api.web import HTMLRequest
from libs import db

@handle_url("/oauth/debug")
class DiscordAuth(HTMLRequest):
    auth_required = False
    phpbb_auth = False
    auth_required = False

    async def get(self):
        self.write(
            self.render_string(
                "basic_header.html", title="RW Auth Debug Page"
            )
        )
        has_phpbb_auth = self.do_phpbb_auth()
        has_session_auth = self.do_rw_session_auth()
        discord_id = db.c.fetch_var("SELECT discord_user_id FROM phpbb_users WHERE user_id = %s", (self.user.id,))

        self.write(f"phpBB Auth? {has_phpbb_auth}<br />")
        self.write(f"OAuth? {has_session_auth}<br />")
        self.write(f"Discord? {discord_id}<br />")

        self.write(self.render_string("basic_footer.html"))

