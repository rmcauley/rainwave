from typing import TypedDict

import qrcode
import qrcode.image.svg
from tornado.web import RequestHandler

from api.handle_url import handle_url
from api.handler_classes.html_registered_user_handler import HtmlRegisteredUserHandler
from common.db.cursor import get_cursor
from common.user.model.registered_user import RegisteredUser


class ApiKeyRow(TypedDict):
    api_id: int
    user_id: int
    api_key: str
    api_expiry: int | None
    api_key_listen_key: str | None


@handle_url("/keys/")
class KeyIndex(HtmlRegisteredUserHandler):
    description = "Used for management of API keys by users."

    async def get(self):
        await write_key_index(self, self.user)


async def write_key_index(request: RequestHandler, user: RegisteredUser):
    async with get_cursor() as cursor:
        ua = request.request.headers.get("User-Agent") or ""

        if ua.lower().find("android") != -1 and not request.get_argument(
            "noredirect", None
        ):
            request.redirect("/keys/app")
            return

        request.write(
            request.render_string(
                "basic_header.html", title=request.locale.translate("api_key_manager")
            )
        )
        request.write(
            "<p>%s: <bold>%s</bold></p>"
            % (request.locale.translate("your_numeric_user_id"), user.id)
        )
        request.write(
            "<table><tr><th>%s</th><th>%s</th><th>%s</th></tr>"
            % (
                request.locale.translate("api_key"),
                request.locale.translate("delete"),
                request.locale.translate("qr_code"),
            )
        )
        for key in await cursor.fetch_all(
            "SELECT * FROM r4_api_keys WHERE user_id = %s",
            (user.id,),
            row_type=ApiKeyRow,
        ):
            url = "rw://%s:%s@rainwave.cc" % (user.id, key["api_key"])
            qr_svg = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage)
            request.write("<tr><td>%s</td>" % key["api_key"])
            request.write(
                '<td><a href="/keys/delete?delete_key=%s">%s</a></td>'
                % (key["api_id"], request.locale.translate("delete"))
            )
            request.write("<td>%s</td>" % (qr_svg.to_string(),))
            request.write("</tr>")
        request.write(
            '<tr><td><a href="/keys/create">%s</a></td><td>&nbsp;</td><td>&nbsp;</td></tr>'
            % (request.locale.translate("create_api_key"))
        )
        request.write(request.render_string("basic_footer.html"))
