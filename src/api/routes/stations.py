from typing import cast

from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.handler_classes.api_handler_with_get import APIHandlerWithGet
from api.helpers import public_relays
from api.routes.tune_in import get_round_robin_url
from common import stations


@handle_api_url("stations")
class StationsRequest(APIHandlerWithGet):
    description = "Get information about all available stations."
    auth_required = False
    return_name = "stations"
    sid_required = False
    allow_cors = True

    async def post(self):
        station_list: rainwave_typeddicts.Stations = []
        for station_id in stations.station_ids:
            station_list.append(
                {
                    "id": cast(rainwave_typeddicts.StationId, station_id),
                    "name": stations.station_id_friendly[station_id],
                    "description": self.locale.translate(
                        "station_description_id_%s" % station_id
                    ),
                    "stream": get_round_robin_url(station_id, user=self.optional_user),
                    "relays": public_relays.public_relays[station_id],
                }
            )
        self.response["stations"] = station_list
