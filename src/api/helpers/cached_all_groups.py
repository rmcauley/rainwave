from api import rainwave_typeddicts
from common import stations
from common.db.cursor import get_cursor

cached_all_groups: dict[int, list[rainwave_typeddicts.SongGroup]] = {}


async def update_all_groups_cache() -> None:
    async with get_cursor() as cursor:
        for sid in stations.station_ids:
            cached_all_groups[sid] = await cursor.fetch_all(
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
                row_type=rainwave_typeddicts.SongGroup,
            )
