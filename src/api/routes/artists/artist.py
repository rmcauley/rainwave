from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import playlist


@handle_api_url("artist")
class ArtistHandler(APIHandler):
    description = "Get detailed information about an artist."
    return_name = "artist"
    fields = {"id": (fieldtypes.artist_id, True)}

    async def post(self):
        artist = playlist.Artist.load_from_id(input["id"))
        artist.load_all_songs(self.sid, self.user.id)
                self.response[self.return_name] = artist.to_dict_full(self.user)
