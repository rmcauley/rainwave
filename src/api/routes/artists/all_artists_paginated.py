import math

from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT
from .all_artists import get_all_artists


@handle_api_url("all_artists_paginated")
class AllArtistsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all artists on the station playlist."
    return_name = "all_artists_paginated"
    fields = {"after": (fieldtypes.integer, False)}

    async def post(self):
        all_artists = get_all_artists(
            sid=self.sid,
        )
        offset = self.get_argument_int("after", 0) or 0
        page = all_artists[offset : offset + PAGE_LIMIT]
        self.response["all_artists_paginated"] = {
            "data": page,
            "has_more": page[-1] != all_artists[-1],
            "progress": min(
                math.ceil((offset + len(page)) / len(all_artists) * 100), 100
            ),
            "next": offset + PAGE_LIMIT,
        }
