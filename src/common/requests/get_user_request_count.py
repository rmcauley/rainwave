from common.db.cursor import RainwaveCursor, RainwaveCursorTx


async def get_request_count_for_station(
    cursor: RainwaveCursor | RainwaveCursorTx, user_id: int, sid: int
) -> bool:
    return (
        await cursor.fetch_guaranteed(
            "SELECT COUNT(*) FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND sid = %s",
            (user_id, sid),
            default=0,
            var_type=int,
        )
    ) > 0


async def get_request_count_for_any_station(
    cursor: RainwaveCursor | RainwaveCursorTx, user_id: int
) -> bool:
    return (
        await cursor.fetch_guaranteed(
            "SELECT COUNT(*) FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s",
            (user_id,),
            default=0,
            var_type=int,
        )
    ) > 0
