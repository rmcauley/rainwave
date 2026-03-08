from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.rainwave_dto import Api4AdminSetSongRequestOnlyPostRequest
from common.db.cursor import get_cursor


@handle_api_url("admin/set_song_request_only")
class SetSongRequestOnly(APIHandler):
    admin_required = True
    description = "Sets a song to be played only by request."

    async def post(self):
        input = self.get_validated_input(Api4AdminSetSongRequestOnlyPostRequest)
        async with get_cursor() as cursor:
            if input.request_only:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_request_only = TRUE, song_request_only_end = NULL WHERE song_id = %s AND sid = %s",
                    (input.song_id, input.sid),
                )
            else:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_request_only_end = 0 WHERE song_id = %s AND sid = %s",
                    (input.song_id, self.sid),
                )

        self.write_rainwave_output()
