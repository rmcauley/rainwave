from time import time as timestamp
from common.db.cursor import RainwaveCursor


async def warm_cooled_albums(cursor: RainwaveCursor, sid: int) -> None:
    await cursor.update(
        "UPDATE r4_album_sid SET album_cool = FALSE WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE",
        (sid, timestamp()),
    )
