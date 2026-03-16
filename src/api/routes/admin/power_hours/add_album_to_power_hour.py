from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor
from api.rainwave_dto import Api4AdminAddAlbumToPowerHourPostRequest


@handle_api_url("admin/add_album_to_power_hour")
class AddAlbumToPowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True
    sid_required = True
    allow_sid_zero = True

    async def post(self):
        input = self.get_validated_input(Api4AdminAddAlbumToPowerHourPostRequest)
        async with get_cursor() as cursor:
            power_hour = await get_power_hour_by_id(cursor, input.sched_id)
            await power_hour.add_album_id(cursor, input.album_id)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
