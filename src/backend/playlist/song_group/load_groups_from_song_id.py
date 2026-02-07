from typing import TypedDict
from backend.db.cursor import RainwaveCursor


class GroupListRow(TypedDict):
    id: int
    name: str
    elec_block: bool


async def load_groups_from_song_id(
    cursor: RainwaveCursor, song_id: int, sid: int
) -> list[GroupListRow]:
    return await cursor.fetch_all(
        """
        SELECT 
            r4_groups.group_id AS id, 
            r4_groups.group_name AS name, 
            group_elec_block AS elec_block, 
        FROM r4_song_sid 
            JOIN r4_song_group USING (song_id) 
            JOIN r4_group_sid ON (
                r4_song_group.group_id = r4_group_sid.group_id
                AND r4_group_sid.sid = %s 
                AND r4_group_sid.group_display = TRUE
            )
        JOIN r4_groups ON (r4_group_sid.group_id = r4_groups.group_id) 
        WHERE r4_song_sid.song_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE 
        ORDER BY r4_groups.group_name
        """,
        (sid, song_id, sid),
        row_type=GroupListRow,
    )
