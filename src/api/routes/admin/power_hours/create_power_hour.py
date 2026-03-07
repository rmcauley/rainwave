from api.handle_url import handle_api_url
from pydantic import BaseModel, PositiveInt

from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.routes.admin.power_hours.get_power_hour_by_id import get_api_power_hour
from common.db.cursor import get_tx_cursor
from common.schedule.create_schedule_entry import create_schedule_entry
from common.schedule.power_hours.power_hour import PowerHour


class CreatePowerHourPostRequest(BaseModel):
    name: str
    start_utc_time: PositiveInt
    end_utc_time: PositiveInt
    url: str | None = None
    fill_unrated: bool | None = None
    sid: int


@handle_api_url("admin/create_power_hour")
class CreatePowerHour(RegisteredUserAPIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = False

    async def post(self):
        input = self.get_validated_input(CreatePowerHourPostRequest)
        async with get_tx_cursor() as cursor:
            schedule_entry_row = await create_schedule_entry(
                cursor,
                {
                    "sched_creator_user_id": self.user.id,
                    "sched_end": input.end_utc_time,
                    "sched_start": input.start_utc_time,
                    "sched_name": input.name,
                    "sched_timed": True,
                    "sched_type": "OneUpProducer",
                    "sched_url": input.name,
                    "sid": input.sid,
                },
            )

            if input.fill_unrated:
                power_hour = PowerHour("OneUpProducer", schedule_entry_row)
                await power_hour.fill_unrated(
                    cursor, input.end_utc_time - input.start_utc_time
                )

            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, schedule_entry_row["sched_id"]
            )
        self.write_rainwave_output()
