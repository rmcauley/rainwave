from typing import Literal, cast

import orjson

from api import rainwave_typeddicts
from common import config

# Sent to the frontend for menu display
station_list: rainwave_typeddicts.StationList = {}
station_mounts: dict[str, int] = {}
for station_id, station in config.stations.items():
    station_list[cast(Literal["1", "2", "3", "4", "5", "6"], str(station_id))] = {
        "id": station_id,
        # "name": config.station_id_friendly[station_id],
        "url": "{}{}/".format(
            config.base_site_url, config.stations[station_id]["stream_filename"]
        ),
    }
    station_mounts[station["stream_filename"] + ".mp3"] = station_id
    station_mounts[station["stream_filename"] + ".ogg"] = station_id

station_list_json = orjson.dumps(station_list)
