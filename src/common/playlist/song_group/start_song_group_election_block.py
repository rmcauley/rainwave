from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def start_song_group_election_block(
    cursor: RainwaveCursor | RainwaveCursorTx,
    group_id: int,
    sid: int,
    num_elections: int,
) -> None:
    await cursor.update(
        """
        UPDATE r4_song_sid
        SET song_elec_blocked = TRUE,
            song_elec_blocked_by = %s,
            song_elec_blocked_num = %s
        FROM r4_song_group
        WHERE r4_song_sid.song_id = r4_song_group.song_id
            AND r4_song_group.group_id = %s
            AND r4_song_sid.sid = %s
            AND song_elec_blocked_num < %s
""",
        ("group", num_elections, group_id, sid, num_elections),
    )
