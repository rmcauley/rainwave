from typing import TypedDict
from backend.db.cursor import RainwaveCursor


class GetAllGroupsRow(TypedDict):
    name: str
    id: int


async def get_all_groups(cursor: RainwaveCursor, sid: int) -> list[GetAllGroupsRow]:
    return await cursor.fetch_all(
        """
            SELECT
                group_name AS name,
                r4_groups.group_id AS id
            FROM r4_group_sid
            JOIN r4_groups USING (group_id)
            WHERE sid = %s
                AND group_display = TRUE
            ORDER BY group_name
""",
        (sid,),
        row_type=GetAllGroupsRow,
    )
