from backend.db.cursor import RainwaveCursor, RainwaveCursorTx
from backend.playlist.song_group.song_group import SongGroup, SongGroupRow


async def get_groups_for_song(
    cursor: RainwaveCursor | RainwaveCursorTx, song_id: int
) -> list[SongGroup]:
    group_rows = await cursor.fetch_all(
        """
        SELECT r4_groups.* 
        FROM r4_song_group USING (song_id) 
            JOIN r4_groups USING (group_id) 
        WHERE r4_songs.song_id = %s
        """,
        (song_id,),
        row_type=SongGroupRow,
    )
    return [SongGroup(group_row) for group_row in group_rows]
