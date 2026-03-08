from typing import cast

from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import playlist
from libs import cache


def get_all_artists(sid: int) -> list[playlist.Artist]:
    return cast(list[playlist.Artist], cache.get_station(sid, "all_artists"))


@handle_api_url("all_artists")
class AllArtistsHandler(APIHandler):
    description = "Get a list of all artists on the station playlist."
    return_name = "all_artists"
    fields = {"no_searchable": (fieldtypes.boolean, None)}

    async def post(self):
        self.response["all_artists"] = (get_all_artists(self.sid),)
        self.write_rainwave_output()
