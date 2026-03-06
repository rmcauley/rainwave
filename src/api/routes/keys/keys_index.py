import asyncio

from api.handler_classes.html_handler import HTMLRequest
from api.handle_url import handle_url
from common.db.cursor import get_cursor


@handle_url("/keys/")
class KeyIndex(HTMLRequest):
    login_required = True
    sid_required = False
    auth_required = False
    description = "Used for management of API keys by users."

    async def get(self):
        async with get_cursor() as cursor:
            global qr_service
            global mini_qr_service

            ua = self.request.headers.get("User-Agent") or ""

            if ua.lower().find("android") != -1 and not input["noredirect"):
                self.redirect("/keys/app")
                return

            self.write(
                self.render_string(
                    "basic_header.html", title=self.locale.translate("api_key_manager")
                )
            )
            self.write(
                "<p>%s: <bold>%s</bold></p>"
                % (self.locale.translate("your_numeric_user_id"), self.user.id)
            )
            self.write(
                "<table><tr><th>%s</th><th>%s</th><th>%s</th></tr>"
                % (
                    self.locale.translate("api_key"),
                    self.locale.translate("delete"),
                    self.locale.translate("qr_code"),
                )
            )
            for key in await cursor.fetch_all(
                "SELECT * FROM r4_api_keys WHERE user_id = %s", (self.user.id,)
            ):
                url = "rw://%s:%s@rainwave.cc" % (self.user.id, key["api_key"])
                qr_url = qr_service % (url,)
                mini_qr_url = mini_qr_service % (url,)
                self.write("<tr><td>%s</td>" % key["api_key"])
                self.write(
                    '<td><a href="/keys/delete?delete_key=%s">%s</a></td>'
                    % (key["api_id"], self.locale.translate("delete"))
                )
                self.write(
                    '<td><a href="%s"><img src="%s" class="qr"></a></td>'
                    % (qr_url, mini_qr_url)
                )
                self.write("</tr>")
            self.write(
                '<tr><td><a href="/keys/create">%s</a></td><td>&nbsp;</td><td>&nbsp;</td></tr>'
                % (self.locale.translate("create_api_key"))
            )
            self.write(self.render_string("basic_footer.html"))
