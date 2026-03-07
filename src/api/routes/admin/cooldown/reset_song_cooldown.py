from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


from common.db.cursor import get_cursor


@handle_api_url("admin/reset_song_cooldown")
class ResetSongCooldown(APIHandler):
    admin_required = True
    sid_required = False
    description = (
        "Sets song cooldown override to null and sets cooldown multiplier to 1."
    )
    fields = {"song_id": (fieldtypes.song_id, True)}

    async def post(self):
        async with get_cursor() as cursor:
            await cursor.update(
                "UPDATE r4_songs SET song_cool_multiply = 1, song_cool_override = NULL WHERE song_id = %s",
                (input.,),
            )
                    self.response[self.return_name] = {"success": True, "text": "Song cooldown reset."}
