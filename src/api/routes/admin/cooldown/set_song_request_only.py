
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api import fieldtypes
from common.db.cursor import get_cursor


@handle_api_url("admin/set_song_request_only")
class SetSongRequestOnly(APIHandler):
    admin_required = True
    sid_required = True
    description = "Sets a song to be played only by request."
    fields = {
        "song_id": (fieldtypes.song_id, True),
        "request_only": (fieldtypes.boolean, True),
    }

    async def post(self):
        async with get_cursor() as cursor:
            if input.:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_request_only = TRUE, song_request_only_end = NULL WHERE song_id = %s AND sid = %s",
                    (input., self.sid),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Song ID %s is now request only."
                        % input.,
                    },
            else:
                await cursor.update(
                    "UPDATE r4_song_sid SET song_request_only_end = 0 WHERE song_id = %s AND sid = %s",
                    (input., self.sid),
                )
                            self.response[self.return_name] = {
                        "success": True,
                        "text": "Song ID %s is not request only."
                        % input.,
                    },
