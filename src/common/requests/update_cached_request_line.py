from common.cache.station_cache import cache_set_station
from common.requests.request_line_types import RequestLineEntry
from common.requests.request_user_positions import RequestUserPositions


async def update_cached_request_line(line: list[RequestLineEntry], sid: int) -> None:
    # user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
    # so users know where they are in line
    user_positions: RequestUserPositions = {}
    # How many people in line are tuned in and have a valid request?
    valid_positions = 0

    for entry in line:
        if entry["line_has_had_valid"]:
            valid_positions += 1
        user_positions[entry["user_id"]] = entry["position"]

    await cache_set_station(sid, "request_line", line)
    await cache_set_station(sid, "request_valid_positions", valid_positions)
    await cache_set_station(sid, "request_user_positions", user_positions)
