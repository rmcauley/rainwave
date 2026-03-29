from typing import cast

from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.cache.station_cache import cache_get_station
from common import stations


@handle_api_url("info_all")
class InfoAllRequest(APIHandler):
    auth_required = False
    description = "Returns a basic dict containing rudimentary information on what is currently playing on all stations."
    allow_cors = True

    async def post(self):
        self.response["all_stations_info"] = cast(
            rainwave_typeddicts.AllStationsInfo,
            {
                str(sid): station_info
                for sid in stations.station_ids
                if (station_info := await cache_get_station(sid, "all_station_info"))
                is not None
            },
        )
