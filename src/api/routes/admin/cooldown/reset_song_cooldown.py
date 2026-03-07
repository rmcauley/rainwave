from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from pydantic import BaseModel


from common.db.cursor import get_cursor


class ResetSongCooldownPostRequest(BaseModel):
    song_id: int


@handle_api_url("admin/reset_song_cooldown")
class ResetSongCooldown(APIHandler):
    admin_required = True
    sid_required = False
    description = (
        "Sets song cooldown override to null and sets cooldown multiplier to 1."
    )

    async def post(self):
        input = self.get_validated_input(ResetSongCooldownPostRequest)
        async with get_cursor() as cursor:
            await cursor.update(
                "UPDATE r4_songs SET song_cool_multiply = 1, song_cool_override = NULL WHERE song_id = %s",
                (input.song_id,),
            )
            self.response["set_song_cooldown_result"] = {
                "tl_key": "success",
                "success": True,
                "text": "Song cooldown reset.",
            }
        self.write_rainwave_output()
