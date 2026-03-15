import orjson

from api.handle_url import handle_url
from api.handler_classes.html_handler import HtmlHandler

from common.db.cursor import get_cursor


@handle_url("/oauth/debug")
class DebugAuth(HtmlHandler):
    auth_required = False
    auth_required = False
    sid_required = False

    async def get(self) -> None:
        async with get_cursor() as cursor:
            self.write(
                self.render_string("basic_header.html", title="RW Auth Debug Page")
            )

            user_id = 1
            discord_id: int | None = None
            username = "Anonymous"
            radio_username = ""

            if self.optional_user and not self.optional_user.is_anonymous():
                user_id = self.optional_user.id
                discord_id = await cursor.fetch_var(
                    "SELECT discord_user_id FROM phpbb_users WHERE user_id = %s",
                    (self.optional_user.id,),
                    var_type=str,
                )
                username = await cursor.fetch_var(
                    "SELECT username FROM phpbb_users WHERE user_id = %s",
                    (self.optional_user.id,),
                    var_type=str,
                )
                radio_username = await cursor.fetch_var(
                    "SELECT radio_username FROM phpbb_users WHERE user_id = %s",
                    (self.optional_user.id,),
                    var_type=str,
                )

            self.write(f"User ID: {user_id}<br />")
            self.write(f"Discord ID: {discord_id}<br />")
            self.write(f"phpBB Username: {username}<br />")
            self.write(f"Display Username: {radio_username}<br />")

            if self.optional_user:
                self.write("<pre>")
                self.write(orjson.dumps(self.optional_user.private_data))
                self.write("</pre>")

            self.write(self.render_string("basic_footer.html"))
