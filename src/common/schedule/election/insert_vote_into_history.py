from common.db.cursor import RainwaveCursor


async def insert_vote_into_history(
    cursor: RainwaveCursor,
    election_id: int,
    entry_id: int,
    user_id: int,
    song_id: int,
    sid: int,
):
    await cursor.update(
        """
            INSERT INTO r4_vote_history (
                elec_id,
                entry_id,
                user_id,
                song_id,
                sid
            )
            VALUES (%s, %s, %s, %s, %s)
        """,
        (
            election_id,
            entry_id,
            user_id,
            song_id,
            sid,
        ),
    )
