from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import playlist


@handle_api_url("song")
class SongHandler(APIHandler):
    description = "Get detailed information about a song."
    return_name = "song"
    fields = {
        "id": (fieldtypes.song_id, True),
        "all_categories": (fieldtypes.boolean, None),
    }

    async def post(self):
        song = playlist.Song.load_from_id(
            input.id,
            self.sid,
            all_categories=self.get_argument_bool("all_categories") or False,
        )
        song.load_extra_detail(self.sid)
        self.response["song"] = song.to_dict(self.user)
