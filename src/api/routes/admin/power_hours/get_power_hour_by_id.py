from api import rainwave_typeddicts
from api.exceptions import APIException
from common.db.cursor import RainwaveCursor
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.schedule_entry_types import ScheduleEntryRow


async def get_api_power_hour(
    cursor: RainwaveCursor, sched_id: int
) -> rainwave_typeddicts.AdminPowerHour:
    power_hour = await cursor.fetch_row(
        """
        SELECT *
        FROM r4_schedule
        WHERE sched_id = %s
        """,
        (sched_id,),
        row_type=rainwave_typeddicts.AdminPowerHour,
    )
    if not power_hour or power_hour["sched_type"] != "OneUpProducer":
        raise APIException("404", status_code=404)
    power_hour["songs"] = await cursor.fetch_all(
        """
        SELECT
            r4_one_ups.*,
            song_title,
            song_length,
            r4_songs.album_id,
            album_name
        FROM r4_one_ups
            JOIN r4_songs USING (song_id)
            JOIN r4_albums USING (album_id)
        WHERE r4_one_ups.sched_id = %s
        ORDER BY r4_one_ups.one_up_order
        """,
        (sched_id,),
        row_type=rainwave_typeddicts.AdminPowerHourSong,
    )
    return power_hour


async def get_power_hour_by_id(cursor: RainwaveCursor, sched_id: int) -> PowerHour:
    schedule_entry_row = await cursor.fetch_row(
        "SELECT * FROM r4_schedule WHERE sched_id = %s AND sched_used = FALSE",
        (sched_id,),
        row_type=ScheduleEntryRow,
    )
    if not schedule_entry_row or schedule_entry_row["sched_type"] != "OneUpProducer":
        raise APIException("404", status_code=404)
    return PowerHour(schedule_entry_row["sched_type"], schedule_entry_row)
