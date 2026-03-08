from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminPowerHourPostRequest
from api.routes.admin.power_hours.get_power_hour_by_id import get_api_power_hour
from common.db.cursor import get_cursor


@handle_api_url("admin/power_hour")
class GetPowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(Api4AdminPowerHourPostRequest)
        async with get_cursor() as cursor:
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
        self.write_rainwave_output()
