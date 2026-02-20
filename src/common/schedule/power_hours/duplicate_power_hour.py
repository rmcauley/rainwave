from common.db.cursor import RainwaveCursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.power_hours.power_hour import PowerHour
from common.schedule.power_hours.power_hour_song import PowerHourSongRow


async def duplicate_power_hour(
    cursor: RainwaveCursor, existing_power_hour: PowerHour
) -> PowerHour:
    duplicated_power_hour_row = await create_schedule_entry(
        cursor,
        {
            "sched_creator_user_id": existing_power_hour.data["sched_creator_user_id"],
            "sched_end": existing_power_hour.data["sched_end"],
            "sched_end_actual": existing_power_hour.data["sched_end_actual"],
            "sched_name": existing_power_hour.data["sched_name"],
            "sched_start": existing_power_hour.data["sched_start"],
            "sched_start_actual": existing_power_hour.data["sched_start_actual"],
            "sched_time": existing_power_hour.data["sched_time"],
            "sched_type": existing_power_hour.data["sched_type"],
            "sched_url": existing_power_hour.data["sched_url"],
            "sched_used": existing_power_hour.data["sched_used"],
            "sid": existing_power_hour.data["sid"],
        },
    )
    duplicated_power_hour = PowerHour("OneUpProducer", duplicated_power_hour_row)
    for song_row in await cursor.fetch_all(
        "SELECT * FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order",
        (existing_power_hour.id,),
        row_type=PowerHourSongRow,
    ):
        await duplicated_power_hour.add_song_id(cursor, song_row["song_id"])
    return duplicated_power_hour
