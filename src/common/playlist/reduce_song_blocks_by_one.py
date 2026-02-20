from common.db.cursor import RainwaveCursor


async def reduce_song_blocks_by_one(cursor: RainwaveCursor, sid: int) -> None:

    await cursor.update(
        "UPDATE r4_song_sid SET song_elec_blocked_num = song_elec_blocked_num - 1 WHERE song_elec_blocked = TRUE AND sid = %s",
        (sid,),
    )
    await cursor.update(
        "UPDATE r4_song_sid SET song_elec_blocked_num = 0, song_elec_blocked = FALSE WHERE song_elec_blocked_num <= 0 AND song_elec_blocked = TRUE AND sid = %s",
        (sid,),
    )
