import math

from api import rainwave_dto
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.helpers.cached_all_groups import cached_all_groups
from api.helpers.paginated_requests import DEFAULT_COLLECTION_PAGE_LIMIT


@handle_api_url("all_groups_paginated")
class AllGroupsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all groups on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_groups_paginated"

    sid_required = True

    async def post(self):
        input = self.get_validated_input(rainwave_dto.Api4AllGroupsPaginatedPostRequest)
        all_groups = cached_all_groups[self.sid]
        offset = input.after or 0
        page = all_groups[offset : offset + DEFAULT_COLLECTION_PAGE_LIMIT]
        total_groups = len(all_groups)
        self.response["all_groups_paginated"] = {
            "data": page,
            "has_more": offset + len(page) < total_groups,
            "progress": (
                min(math.ceil((offset + len(page)) / total_groups * 100), 100)
                if total_groups > 0
                else 100
            ),
            "next": offset + DEFAULT_COLLECTION_PAGE_LIMIT,
        }
