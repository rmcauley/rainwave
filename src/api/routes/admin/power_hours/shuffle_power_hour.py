from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler
from api.rainwave_dto import Api4AdminShufflePowerHourPostRequest

from common.db.cursor import get_cursor
from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)


@handle_api_url("admin/shuffle_power_hour")
class ShufflePowerHour(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_power_hour"

    admin_required = True
    sid_required = True

    async def post(self):
        input = self.get_validated_input(Api4AdminShufflePowerHourPostRequest)
        async with get_cursor() as cursor:
            schedule_entry = await get_power_hour_by_id(cursor, input.sched_id)
            await schedule_entry.shuffle_songs(cursor)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
