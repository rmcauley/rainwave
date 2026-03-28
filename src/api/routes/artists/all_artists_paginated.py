import math

from api import rainwave_dto
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.helpers import cached_all_artists
from api.helpers.paginated_requests import DEFAULT_COLLECTION_PAGE_LIMIT


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
        page = all_artists[offset : offset + DEFAULT_COLLECTION_PAGE_LIMIT]
        total_artists = len(all_artists)
        self.response["all_artists_paginated"] = {
            "data": page,
            "has_more": offset + len(page) < total_artists,
            "progress": (
                min(math.ceil((offset + len(page)) / total_artists * 100), 100)
                if total_artists > 0
                else 100
            ),
            "next": offset + DEFAULT_COLLECTION_PAGE_LIMIT,
        }
