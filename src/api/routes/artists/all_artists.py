from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers import cached_all_artists
from api.rainwave_return_key_to_open_api import RainwaveResponseKey


@handle_api_url("all_artists")
class AllArtistsHandler(APIHandler):
    description = "Returns all artists on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_artists"

    async def post(self):
        self.response["all_artists"] = cached_all_artists.cached_all_artists[self.sid]
