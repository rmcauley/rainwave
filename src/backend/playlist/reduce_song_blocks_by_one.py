def reduce_song_blocks_by_one(sid: int) -> None:
    db.c.update(
        "UPDATE r4_song_sid SET song_elec_blocked_num = song_elec_blocked_num - 1 WHERE song_elec_blocked = TRUE AND sid = %s",
        (sid,),
    )
    db.c.update(
        "UPDATE r4_song_sid SET song_elec_blocked_num = 0, song_elec_blocked = FALSE WHERE song_elec_blocked_num <= 0 AND song_elec_blocked = TRUE AND sid = %s",
        (sid,),
    )
