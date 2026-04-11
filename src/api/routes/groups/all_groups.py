from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.cached_all_groups import cached_all_groups
from api.rainwave_return_key_to_open_api import RainwaveResponseKey


@handle_api_url("all_groups")
class AllGroupsHandler(APIHandler):
    description = "Returns all groups on the station playlist."

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "all_groups"

    sid_required = True

    async def post(self):
        self.response["all_groups"] = cached_all_groups[self.sid]
