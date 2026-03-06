from common.libs import db
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api import fieldtypes


@handle_api_url("admin/reset_album_cooldown")
class ResetAlbumCooldown(APIHandler):
    admin_required = True
    description = (
        "Sets album cooldown override to null and sets cooldown multiplier to 1."
    )
    fields = {"album_id": (fieldtypes.album_id, True)}

    def post(self):
        await cursor.update(
            "UPDATE r4_album_sid SET album_cool_multiply = 1, album_cool_override = NULL WHERE album_id = %s AND sid = %s",
            (self.get_argument("album_id"), self.sid),
        )
        self.append(
            self.return_name,
            {"success": True, "text": "Album cooldown multiplier and override reset."},
        )
