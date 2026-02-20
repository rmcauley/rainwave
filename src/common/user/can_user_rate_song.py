from common.cache.station_cache import cache_get_station
from common.user.model.user_base import UserBase


async def can_user_rate_song(user: UserBase, sid: int, song_id: int) -> bool:
    if user.id == 1:
        return False

    if user.private_data["rate_anything"]:
        return True

    acl = await cache_get_station(sid, "user_rating_acl")
    if acl and song_id in acl and user.id in acl[song_id]:
        return True

    return False
