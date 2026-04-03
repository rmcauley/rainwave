from datetime import datetime, timedelta
from pytz import timezone

from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.rainwave_dto import Api4AdminEuropifyPowerHourPostRequest

from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor
from common.schedule.power_hours.duplicate_power_hour import duplicate_power_hour


@handle_api_url("admin/europify_power_hour")
class EuropifyPowerHour(RegisteredUserAPIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_power_hour"

    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(Api4AdminEuropifyPowerHourPostRequest)
        async with get_cursor() as cursor:
            existing_schedule_entry = await get_power_hour_by_id(cursor, input.sched_id)
            if not existing_schedule_entry.data["sched_start"]:
                raise APIException(
                    "missing_argument", "No start time on existing power hour."
                )
            new_schedule_entry = await duplicate_power_hour(
                cursor, existing_schedule_entry, self.user.id
            )

            start_eu = datetime.fromtimestamp(
                existing_schedule_entry.data["sched_start"], timezone("UTC")
            ).replace(tzinfo=timezone("Europe/London")).replace(
                hour=10, minute=0, second=0, microsecond=0
            ) + timedelta(
                days=1
            )
            start_epoch_eu = int(
                (start_eu - datetime.fromtimestamp(0, timezone("UTC"))).total_seconds()
            )
            await new_schedule_entry.change_start(cursor, start_epoch_eu)
            await cursor.update(
                "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
                (
                    (existing_schedule_entry.data["sched_name"] or "") + " Reprisal",
                    new_schedule_entry.id,
                ),
            )
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, new_schedule_entry.id
            )
