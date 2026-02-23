from api.exceptions import APIException
from common.cache.station_cache import cache_get_station


async def check_sync_status(sid: int, offline_ack: bool | None = False) -> None:
    if not await cache_get_station(sid, "backend_ok") and not offline_ack:
        raise APIException("station_offline")
