from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler


from common.db.cursor import get_cursor


@handle_api_url("admin/set_song_cooldown")
class SetSongCooldown(APIHandler):
    admin_required = True
    sid_required = False
    description = "Sets the song cooldown multiplier and override.  Passing null or false for either argument will retain its current setting. (non-destructive update)"
    fields = {
        "song_id": (fieldtypes.song_id, True),
        "multiply": (fieldtypes.float_num, None),
        "override": (fieldtypes.integer, None),
    }

    async def post(self):
        async with get_cursor() as cursor:
            if input. and input.:
                await cursor.update(
                    "UPDATE r4_songs SET song_cool_multiply = %s, song_cool_override = %s WHERE song_id = %s",
                    (
                        input.,
                        input.,
                        input.,
                    ),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Song cooldown multiplier and override updated.",
                    },
            elif input.:
                await cursor.update(
                    "UPDATE r4_songs SET song_cool_multiply = %s WHERE song_id = %s",
                    (input., input.),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Song cooldown multiplier updated.  Override untouched.",
                    },
            elif input.:
                await cursor.update(
                    "UPDATE r4_songs SET AND song_cool_override = %s WHERE song_id = %s",
                    (input., input.),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Song cooldown override updated.  Multiplier untouched.",
                    },
            else:
                            self.response[self.return_name] = {
                        "success": False,
                        "text": "Neither multiply or override parameters set.",
                    },
