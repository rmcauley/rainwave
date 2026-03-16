from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.cache.cache import cache_get


@handle_api_url("info_all")
class InfoAllRequest(APIHandler):
    auth_required = False
    description = "Returns a basic dict containing rudimentary information on what is currently playing on all stations."
    allow_cors = True

    async def post(self):
        self.response["all_stations_info"] = await cache_get("all_stations_info")
