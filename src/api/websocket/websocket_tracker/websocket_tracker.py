from typing import Final

from api.websocket.websocket_tracker.websocket_tracker_for_station import (
    WebsocketTrackerForStation,
)
from common import stations

websockets_by_sid: Final[dict[int, WebsocketTrackerForStation]] = {}
for sid in stations.station_ids:
    websockets_by_sid[sid] = WebsocketTrackerForStation()
