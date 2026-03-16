from api import rainwave_typeddicts
from common.cache.station_cache import cache_get_station


async def get_request_line_api(sid: int) -> rainwave_typeddicts.RequestLine:
    return await cache_get_station(sid, "request_line")
