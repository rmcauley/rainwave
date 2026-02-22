from common.db.cursor import RainwaveCursor
from common.schedule.duplicate_schedule_entry import duplicate_schedule_entry
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.power_hours.power_hour_song import PowerHourSongRow


async def duplicate_power_hour(
    cursor: RainwaveCursor, existing_power_hour: PowerHour, creating_user_id: int
) -> PowerHour:
    duplicated_power_hour_row = await duplicate_schedule_entry(
        cursor, existing_power_hour.data, creating_user_id
    )

    duplicated_power_hour = PowerHour("OneUpProducer", duplicated_power_hour_row)
    for song_row in await cursor.fetch_all(
        "SELECT * FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order",
        (existing_power_hour.id,),
        row_type=PowerHourSongRow,
    ):
        await duplicated_power_hour.add_song_id(cursor, song_row["song_id"])
    return duplicated_power_hour
