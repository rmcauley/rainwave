from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminSetSongCooldownPostRequest

from common.db.cursor import get_cursor

@handle_api_url("admin/set_song_cooldown")
class SetSongCooldown(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "set_song_cooldown_result"
    admin_required = True
    description = "Sets the song cooldown multiplier and override.  Passing null or false for either argument will retain its current setting. (non-destructive update)"

    async def post(self):
        input = self.get_validated_input(Api4AdminSetSongCooldownPostRequest)
        async with get_cursor() as cursor:
            if input.multiply is not None and input.override is not None:
                await cursor.update(
                    "UPDATE r4_songs SET song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s",
                    (
                        input.multiply,
                        input.override,
                        input.song_id,
                    ),
                )
                self.response["set_song_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Song cooldown multiplier and override updated.",
                }
            elif input.multiply is not None:
                await cursor.update(
                    "UPDATE r4_songs SET song_cool_multiply = %s WHERE song_id = %s",
                    (input.multiply, input.song_id),
                )
                self.response["set_song_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Song cooldown multiplier updated.  Override untouched.",
                }

            elif input.override is not None:
                await cursor.update(
                    "UPDATE r4_songs SET song_cool_override = %s WHERE song_id = %s",
                    (input.override, input.song_id),
                )
                self.response["set_song_cooldown_result"] = {
                    "tl_key": "success",
                    "success": True,
                    "text": "Song cooldown override updated.  Multiplier untouched.",
                }

            else:
                self.response["set_song_cooldown_result"] = {
                    "tl_key": "oops",
                    "success": False,
                    "text": "Neither multiply or override parameters set.",
                }
