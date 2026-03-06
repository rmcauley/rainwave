from api import fieldtypes
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from api.handle_url import handle_api_url
from common.libs import db

from common.rainwave import rating
from common.db.cursor import get_cursor


@handle_api_url("fave_all_songs")
class SubmitFaveAllSongs(SubmitAlbumFave):
    sid_required = True
    _fave_type = "song_batched"
    perks_required = True
    description = "Faves or un-faves all songs in an album.  Only songs on station ID provided will be faved."

    async def post(self):
        async with get_cursor() as cursor:
            song_ids = await cursor.fetch_list(
                "SELECT r4_song_sid.song_id FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE album_id = %s AND sid = %s",
                (input., self.sid),
            )
            for song_id in song_ids:
                self._batched_id = song_id
                super().post()
            self.append_standard(
                "fave_success",
                "Fave status for all songs changed.",
                song_ids=song_ids,
                fave=input.,
                sid=self.sid,
            )
            self.write_rainwave_output()
