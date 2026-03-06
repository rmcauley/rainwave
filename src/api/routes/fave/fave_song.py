from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import rating


@handle_api_url("fave_song")
class SubmitSongFave(APIHandler):
    _fave_type = "song"
    _batched_id = None
    login_required = True
    tunein_required = False
    sid_required = False
    description = "Fave or un-fave a song."
    fields = {"song_id": (fieldtypes.song_id, True), "fave": (fieldtypes.boolean, True)}
    sync_across_sessions = True

    async def post(self):
        object_id = input[self._fave_type + "_id"]
        fave = self.get_argument_bool("fave") or False
        result = False

        if self._fave_type == "song_batched":
            result = rating.set_song_fave(self._batched_id, self.user.id, fave)
        elif self._fave_type == "song":
            result = rating.set_song_fave(object_id, self.user.id, fave)
        elif self._fave_type == "album":
            result = rating.set_album_fave(self.sid, object_id, self.user.id, fave)
        if result:
            text = None
            if fave:
                text = "Favourited " + self._fave_type + "."
            else:
                text = "Unfavourited " + self._fave_type + "."
            self.append_standard(
                "fave_success", text, id=object_id, fave=fave, sid=self.sid
            )
        else:
            raise APIException("fave_failed", "Fave failed.")
        self.write_rainwave_output()
