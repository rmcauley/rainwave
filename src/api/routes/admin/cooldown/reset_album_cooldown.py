from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.rainwave_dto import Api4AdminResetAlbumCooldownPostRequest
from common.db.cursor import get_cursor


@handle_api_url("admin/reset_album_cooldown")
class ResetAlbumCooldown(APIHandler):
    admin_required = True
    description = (
        "Sets album cooldown override to null and sets cooldown multiplier to 1."
    )

    async def post(self):
        input = self.get_validated_input(Api4AdminResetAlbumCooldownPostRequest)
        async with get_cursor() as cursor:
            await cursor.update(
                "UPDATE r4_album_sid SET album_cool_multiply = 1, album_cool_override = NULL WHERE album_id = %s AND sid = %s",
                (input.album_id, self.sid),
            )
            self.response["set_album_cooldown_result"] = {
                "tl_key": "success",
                "success": True,
                "text": "Album cooldown multiplier and override reset.",
            }
