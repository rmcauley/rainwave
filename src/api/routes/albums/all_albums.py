from typing import Any

from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT
from common.rainwave import playlist
from libs import cache


def get_all_albums(sid: int, user: Any | None = None) -> Any:
    if not user or user.is_anonymous():
        return cache.get_station(sid, "all_albums")
    else:
        return playlist.get_all_albums_list(sid, user)


@handle_api_url("all_albums")
class AllAlbumsHandler(APIHandler):
    description = "Get a list of all albums on the station playlist."
    return_name = "all_albums"
    fields = {"no_searchable": (fieldtypes.boolean, None)}

    async def post(self):
        self.response["all_albums"] = get_all_albums(
            self.sid,
            self.user,
        )
        self.write_rainwave_output()
