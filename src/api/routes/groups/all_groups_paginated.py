import math

from api import rainwave_dto
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.helpers.cached_all_groups import cached_all_groups
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT

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
        page = all_groups[offset : offset + PAGE_LIMIT]
        self.response["all_groups_paginated"] = {
            "data": page,
            "has_more": page[-1] != all_groups[-1],
            "progress": min(
                math.ceil((offset + len(page)) / len(all_groups) * 100), 100
            ),
            "next": offset + PAGE_LIMIT,
        }
