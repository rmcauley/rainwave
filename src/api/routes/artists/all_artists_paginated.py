import math

from api import rainwave_dto
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.helpers import cached_all_artists
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT

@handle_api_url("all_artists_paginated")
class AllArtistsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all artists on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_artists_paginated"

    async def post(self):
        input = self.get_validated_input(
            rainwave_dto.Api4AllArtistsPaginatedPostRequest
        )
        all_artists = cached_all_artists.cached_all_artists[self.sid]
        offset = input.after or 0
        page = all_artists[offset : offset + PAGE_LIMIT]
        self.response["all_artists_paginated"] = {
            "data": page,
            "has_more": page[-1] != all_artists[-1],
            "progress": min(
                math.ceil((offset + len(page)) / len(all_artists) * 100), 100
            ),
            "next": offset + PAGE_LIMIT,
        }
