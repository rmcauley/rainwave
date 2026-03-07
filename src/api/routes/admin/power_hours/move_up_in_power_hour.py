from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from pydantic import BaseModel, PositiveInt

from common.db.cursor import get_cursor


class MoveUpInPowerHourPostRequest(BaseModel):
    one_up_id: PositiveInt


@handle_api_url("admin/move_song_up_in_power_hour")
class MoveUpInPowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(MoveUpInPowerHourPostRequest)
        async with get_cursor() as cursor:
            sched_id = await cursor.fetch_var(
                "SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s",
                (input.one_up_id,),
                var_type=int,
            )
            if not sched_id:
                raise APIException("invalid_argument", "Invalid Power Hour song ID.")
            schedule_entry = await get_power_hour_by_id(cursor, sched_id)
            await schedule_entry.move_song_up(cursor, input.one_up_id)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, sched_id
            )
