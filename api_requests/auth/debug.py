from api.urls import handle_url
from api.web import HTMLRequest
from libs import db


@handle_url("/oauth/debug")
class DebugAuth(HTMLRequest):
    auth_required = False
    phpbb_auth = False
    auth_required = False
    sid_required = False

    async def get(self):
        self.write(self.render_string("basic_header.html", title="RW Auth Debug Page"))
        has_phpbb_auth = self.do_phpbb_auth()
        has_session_auth = self.do_rw_session_auth()
        discord_id = db.c.fetch_var(
            "SELECT discord_user_id FROM phpbb_users WHERE user_id = %s",
            (self.user.id,),
        )
        username = db.c.fetch_var(
            "SELECT username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )
        radio_username = db.c.fetch_var(
            "SELECT radio_username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )

        self.write(f"User ID: {self.user.id}<br />")
        self.write(f"phpBB Auth: {has_phpbb_auth}<br />")
        self.write(f"RW Session Auth: {has_session_auth}<br />")
        self.write(f"Discord ID: {discord_id}<br />")
        self.write(f"phpBB Username: {username}<br />")
        self.write(f"Display Username: {radio_username}<br />")

        self.write(self.render_string("basic_footer.html"))


@handle_url("/oauth/phpbb_debug")
class DebugPhpbbAuth(HTMLRequest):
    auth_required = False
    phpbb_auth = True
    auth_required = False
    sid_required = False

    async def get(self):
        self.write(self.render_string("basic_header.html", title="RW Auth Debug Page"))
        discord_id = db.c.fetch_var(
            "SELECT discord_user_id FROM phpbb_users WHERE user_id = %s",
            (self.user.id,),
        )
        username = db.c.fetch_var(
            "SELECT username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )
        radio_username = db.c.fetch_var(
            "SELECT radio_username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )

        self.write(f"User ID: {self.user.id}<br />")
        self.write(f"Discord ID: {discord_id}<br />")
        self.write(f"phpBB Username: {username}<br />")
        self.write(f"Display Username: {radio_username}<br />")

        self.write(self.render_string("basic_footer.html"))


@handle_url("/oauth/rw_debug")
class DebugRwAuth(HTMLRequest):
    auth_required = True
    phpbb_auth = False
    auth_required = False
    sid_required = False

    async def get(self):
        self.write(self.render_string("basic_header.html", title="RW Auth Debug Page"))
        discord_id = db.c.fetch_var(
            "SELECT discord_user_id FROM phpbb_users WHERE user_id = %s",
            (self.user.id,),
        )
        username = db.c.fetch_var(
            "SELECT username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )
        radio_username = db.c.fetch_var(
            "SELECT radio_username FROM phpbb_users WHERE user_id = %s", (self.user.id,)
        )

        self.write(f"User ID: {self.user.id}<br />")
        self.write(f"Discord ID: {discord_id}<br />")
        self.write(f"phpBB Username: {username}<br />")
        self.write(f"Display Username: {radio_username}<br />")

        self.write(self.render_string("basic_footer.html"))
