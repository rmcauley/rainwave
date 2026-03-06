from api.handler_classes.api_handler_with_get import APIHandlerWithGet


@handle_api_url("stations")
class StationsRequest(APIHandlerWithGet):
    description = "Get information about all available stations."
    auth_required = False
    return_name = "stations"
    sid_required = False
    allow_cors = True

    async def post(self):
        station_list = []
        for station_id in config.station_ids:
            station_list.append(
                {
                    "id": station_id,
                    "name": config.station_id_friendly[station_id],
                    "description": self.locale.translate(
                        "station_description_id_%s" % station_id
                    ),
                    "stream": routes.tune_in.get_round_robin_url(
                        station_id, user=self.user
                    ),
                    "relays": config.public_relays[station_id],
                    "key": config.get_station(station_id, "stream_filename"),
                }
            )
                self.response[self.return_name] = station_list
