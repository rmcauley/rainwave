from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminSetAlbumCooldownPostRequest
from api.rainwave_return_key_to_open_api import RainwaveResponseKey


from common.db.cursor import get_cursor


@handle_api_url("admin/set_album_cooldown")
class SetAlbumCooldown(APIHandler):
    admin_required = True
    description = "Sets the album cooldown multiplier and override PER STATION.  Passing null or false for either argument will retain its current setting. (non-destructive update)"

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "set_album_cooldown_result"

    async def post(self):
        input = self.get_validated_input(Api4AdminSetAlbumCooldownPostRequest)
        async with get_cursor() as cursor:
            if input.multiply is not None and input.override is not None:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_multiply = %s, album_cool_override = %s WHERE album_id = %s AND sid = %s",
                    (
                        input.multiply,
                        input.override,
                        input.album_id,
                        self.sid,
                    ),
                )
                self.response["set_album_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Album cooldown multiplier and override updated.",
                }
            elif input.multiply is not None:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_multiply = %s WHERE album_id = %s AND sid = %s",
                    (
                        input.multiply,
                        input.album_id,
                        self.sid,
                    ),
                )
                self.response["set_album_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Album cooldown multiplier updated.  Override untouched.",
                }
            elif input.override is not None:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_cool_override = %s WHERE album_id = %s AND sid = %s",
                    (
                        input.override,
                        input.album_id,
                        self.sid,
                    ),
                )
                self.response["set_album_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Album cooldown override updated.  Override untouched.",
                }
            else:
                self.response["set_album_cooldown_result"] = {
                    "tl_key": "oops",
                    "success": False,
                    "text": "Neither multiply or override parameters set.",
                }
