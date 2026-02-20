from common.db.cursor import RainwaveCursor


async def remove_all_locks(cursor: RainwaveCursor, sid: int) -> None:
    await cursor.update(
        "UPDATE r4_song_sid SET song_elec_blocked = FALSE, song_elec_blocked_num = 0, song_cool = FALSE, song_cool_end = 0 WHERE sid = %s",
        (sid,),
    )
    await cursor.update(
        "UPDATE r4_album_sid SET album_cool = FALSE AND album_cool_lowest = 0 WHERE sid = %s",
        (sid,),
    )
