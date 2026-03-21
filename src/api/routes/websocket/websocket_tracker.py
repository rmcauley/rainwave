from typing import Final

from api.routes.websocket.websocket_tracker_for_station import (
    WebsocketTrackerForStation,
)
from common import stations

vote_once_every_seconds = 5  # how many seconds have to pass before a user has their vote live broadcast if they're spamming

websockets_by_sid: Final[dict[int, WebsocketTrackerForStation]] = {}
for sid in stations.station_ids:
    websockets_by_sid[sid] = WebsocketTrackerForStation()
    delayed_live_vote[sid] = None
    delayed_live_vote_timers[sid] = None
