from api.routes.admin.power_hours.get_power_hour_by_id import get_power_hour_by_id
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api.rainwave_dto import Api4AdminDeletePowerHourPostRequest
from common.db.cursor import get_cursor


@handle_api_url("admin/delete_power_hour")
class DeletePowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = False

    async def post(self):
        input = self.get_validated_input(Api4AdminDeletePowerHourPostRequest)
        async with get_cursor() as cursor:
            schedule_entry = await get_power_hour_by_id(cursor, input.sched_id)
            if not schedule_entry:
                raise APIException(
                    "404",
                    "Producer ID %s not found." % input.sched_id,
                )
            await cursor.update(
                "DELETE FROM r4_schedule WHERE sched_id = %s",
                (input.sched_id,),
            )
