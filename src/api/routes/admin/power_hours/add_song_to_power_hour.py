from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from pydantic import BaseModel

from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from common.db.cursor import get_cursor


class AddSongToPowerHourPostRequest(BaseModel):
    sched_id: int
    song_id: int


@handle_api_url("admin/add_song_to_power_hour")
class AddSongToPowerHour(APIHandler):
    return_name = "admin_power_hour"
    admin_required = True

    async def post(self):
        input = self.get_validated_input(AddSongToPowerHourPostRequest)
        async with get_cursor() as cursor:
            power_hour = await get_power_hour_by_id(cursor, input.sched_id)
            await power_hour.add_song_id(cursor, input.song_id)
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
        self.write_rainwave_output()
