from common.db.cursor import RainwaveCursor


async def start_album_election_block(
    cursor: RainwaveCursor,
    album_id: int,
    sid: int,
    num_elections: int,
) -> None:
    # refer to song.set_election_block for base SQL
    await cursor.update(
        """
            UPDATE r4_song_sid
            SET song_elec_blocked = TRUE,
                song_elec_blocked_by = %s,
                song_elec_blocked_num = %s
            FROM r4_songs
            WHERE r4_song_sid.song_id = r4_songs.song_id
                AND album_id = %s
                AND sid = %s
                AND song_elec_blocked_num <= %s
""",
        ("album", num_elections, album_id, sid, num_elections),
    )
