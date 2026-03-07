from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from pydantic import BaseModel

from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor


class ChangeProducerNamePostRequest(BaseModel):
    sched_id: int
    name: str


@handle_api_url("admin/change_producer_name")
class ChangeProducerName(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = False

    async def post(self):
        input = self.get_validated_input(ChangeProducerNamePostRequest)
        async with get_cursor() as cursor:
            await get_power_hour_by_id(cursor, input.sched_id)
            await cursor.update(
                "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
                (input.name, input.sched_id),
            )
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
            self.write_rainwave_output()
