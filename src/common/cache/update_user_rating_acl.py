import asyncio
from .station_cache import cache_get_station, cache_set_station
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from typing import TypeAlias

UserRatingACL: TypeAlias = dict[int, dict[int, bool]]


async def update_user_rating_acl(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, song_id: int
) -> None:
    user_rating_acl: UserRatingACL = await cache_get_station(sid, "user_rating_acl")
    if not user_rating_acl:
        user_rating_acl = {}

    songs: list[int] = await cache_get_station(sid, "user_rating_acl_song_index")
    if not songs:
        songs = []

    while len(songs) > 5:
        to_remove = songs.pop(0)
        if to_remove in user_rating_acl:
            del user_rating_acl[to_remove]
    songs.append(song_id)
    user_rating_acl[song_id] = {}

    for user_id in await cursor.fetch_list(
        "SELECT user_id FROM r4_listeners WHERE sid = %s AND user_id > 1",
        (sid,),
        row_type=int,
    ):
        user_rating_acl[song_id][user_id] = True

    await asyncio.gather(
        cache_set_station(sid, "user_rating_acl", user_rating_acl, save_in_memory=True),
        cache_set_station(
            sid, "user_rating_acl_song_index", songs, save_in_memory=True
        ),
    )
