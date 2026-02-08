from typing import TypedDict
from common.db.cursor import RainwaveCursor


class AllGroupsforPowerHourRow(TypedDict):
    name: str
    id: int
    song_count: int


async def get_all_groups_for_power_hour(
    cursor: RainwaveCursor, sid: int
) -> list[AllGroupsforPowerHourRow]:
    return await cursor.fetch_all(
        """
        SELECT 
            group_name AS name, 
            group_id AS id, 
            COUNT(*) AS song_count 
        FROM (
            SELECT
                group_name, 
                group_id, 
                COUNT(DISTINCT(album_id)) 
            FROM r4_groups 
                JOIN r4_song_group USING (group_id) 
                JOIN r4_song_sid ON (
                    r4_song_group.song_id = r4_song_sid.song_id 
                    AND r4_song_sid.sid = %s 
                    AND r4_song_sid.song_exists = TRUE
                ) 
                JOIN r4_songs ON (
                    r4_song_group.song_id = r4_songs.song_id 
                    AND r4_songs.song_verified = TRUE
                ) 
                JOIN r4_albums USING (album_id) 
            GROUP BY group_id, group_name 
        ) AS multi_album_groups 
            JOIN r4_song_group USING (group_id) 
            JOIN r4_song_sid using (song_id) 
        WHERE r4_song_sid.sid = %s AND song_exists = TRUE 
        GROUP BY group_id, group_name 
        ORDER BY group_name
""",
        (
            sid,
            sid,
        ),
        row_type=AllGroupsforPowerHourRow,
    )
