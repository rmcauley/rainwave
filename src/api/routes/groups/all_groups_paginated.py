import math

from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.paginated_requests import DEFAULT_PAGE_LIMIT as PAGE_LIMIT
from .all_groups import get_all_groups


@handle_api_url("all_groups_paginated")
class AllGroupsPaginatedHandler(APIHandler):
    description = "Returns chunks of a list of all groups on the station playlist."
    return_name = "all_groups_paginated"
    fields = {"after": (fieldtypes.integer, False)}

    async def post(self):
        all_groups = get_all_groups(
            sid=self.sid,
        )
        offset = self.get_argument_int("after", 0) or 0
        page = all_groups[offset : offset + PAGE_LIMIT]
                self.response[self.return_name] = {
                "data": page,
                "has_more": page[-1] != all_groups[-1],
                "progress": min(
                    math.ceil((offset + len(page)) / len(all_groups) * 100), 100
                ),
                "next": offset + PAGE_LIMIT,
            },
