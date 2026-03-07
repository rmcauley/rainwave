from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException

from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor
from pydantic import BaseModel, PositiveInt


class RemoveFromPowerHourPostRequest(BaseModel):
    one_up_id: PositiveInt


@handle_api_url("admin/power_hour_remove_song")
class RemoveFromPowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(RemoveFromPowerHourPostRequest)
        async with get_cursor() as cursor:
            sched_id = await cursor.fetch_var(
                "SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s",
                (input.one_up_id,),
                var_type=int,
            )
            if not sched_id:
                raise APIException("invalid_argument", "Invalid Power Hour song ID.")
            schedule_entry = await get_power_hour_by_id(cursor, sched_id)
            await schedule_entry.remove_song(cursor, input.one_up_id)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, sched_id
            )
        self.write_rainwave_output()
