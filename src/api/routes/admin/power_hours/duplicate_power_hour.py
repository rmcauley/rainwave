from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.rainwave_dto import Api4AdminDuplicatePowerHourPostRequest
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor
from common.schedule.power_hours.duplicate_power_hour import duplicate_power_hour


@handle_api_url("admin/duplicate_power_hour")
class DuplicatePowerHour(RegisteredUserAPIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(Api4AdminDuplicatePowerHourPostRequest)
        async with get_cursor() as cursor:
            existing_schedule_entry = await get_power_hour_by_id(cursor, input.sched_id)
            if not existing_schedule_entry.data["sched_start"]:
                raise APIException(
                    "missing_argument", "No start time on existing power hour."
                )
            new_schedule_entry = await duplicate_power_hour(
                cursor, existing_schedule_entry, self.user.id
            )
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, new_schedule_entry.id
            )
