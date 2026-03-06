def get_all_groups(sid: int) -> list[playlist.SongGroup]:
    return cast(list[playlist.SongGroup], cache.get_station(sid, "all_groups"))


def get_all_groups_power(sid: int) -> list[playlist.SongGroup]:
    return cast(list[playlist.SongGroup], cache.get_station(sid, "all_groups_power"))


from typing import cast

from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave import playlist
from libs import cache


@handle_api_url("all_groups")
class AllGroupsHandler(APIHandler):
    description = "Get a list of all song groups on the station playlist.  Supply the 'all' flag to get a list of categories that includes categories that only contain a single album."
    return_name = "all_groups"
    fields = {
        "all": (fieldtypes.boolean, None),
        "no_searchable": (fieldtypes.boolean, None),
    }

    async def post(self):
        if self.get_argument("all"):
            self.response[self.return_name] = (get_all_groups_power(self.sid),)
        else:
            self.response[self.return_name] = (get_all_groups(self.sid),)
        self.write_rainwave_output()
