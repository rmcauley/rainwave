from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def start_song_election_block(
    cursor: RainwaveCursor | RainwaveCursorTx,
    song_id: int,
    sid: int,
    num_elections: int,
) -> None:
    await cursor.update(
        """
        UPDATE r4_song_sid SET 
            song_elec_blocked = TRUE, 
            song_elec_blocked_by = %s, 
            song_elec_blocked_num = %s 
        WHERE 
            song_id = %s 
            AND sid = %s 
            AND song_elec_blocked_num <= %s
        """,
        ("in_election", num_elections, song_id, sid, num_elections),
    )
