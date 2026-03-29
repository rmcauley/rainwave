from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminChangePowerHourStartTimePostRequest
from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor


@handle_api_url("admin/change_power_hour_start_time")
class ChangePowerHourStartTime(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_power_hour"
    admin_required = True

    async def post(self):
        input = self.get_validated_input(Api4AdminChangePowerHourStartTimePostRequest)
        async with get_cursor() as cursor:
            power_hour = await get_power_hour_by_id(cursor, input.sched_id)
            await power_hour.change_start(cursor, input.utc_time)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
