from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler

from common.libs import db
from common.db.cursor import get_cursor


@handle_api_url("admin/set_album_cooldown")
class SetAlbumCooldown(APIHandler):
    admin_required = True
    description = "Sets the album cooldown multiplier and override PER STATION.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
    fields = {
        "album_id": (fieldtypes.album_id, True),
        "multiply": (fieldtypes.float_num, None),
        "override": (fieldtypes.integer, None),
    }

    async def post(self):
        async with get_cursor() as cursor:
            if self.get_argument("multiply") and self.get_argument("override"):
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_multiply = %s, album_cool_override = %s WHERE album_id = %s AND sid = %s",
                    (
                        self.get_argument("multiply"),
                        self.get_argument("override"),
                        self.get_argument("album_id"),
                        self.sid,
                    ),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Album cooldown multiplier and override updated.",
                    },
            elif self.get_argument("multiply"):
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_multiply = %s WHERE album_id = %s AND sid = %s",
                    (
                        self.get_argument("multiply"),
                        self.get_argument("album_id"),
                        self.sid,
                    ),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Album cooldown multiplier updated.  Override untouched.",
                    },
            elif self.get_argument("override"):
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_override = %s WHERE album_id = %s AND sid = %s",
                    (
                        self.get_argument("override"),
                        self.get_argument("album_id"),
                        self.sid,
                    ),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Album cooldown override updated.  Override untouched.",
                    },
            else:
                            self.response[self.return_name] = {
                        "success": False,
                        "text": "Neither multiply or override parameters set.",
                    },
