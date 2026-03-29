from api.routes.admin.power_hours.get_power_hour_by_id import (
    get_api_power_hour,
    get_power_hour_by_id,
)
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.exceptions import APIException
from api.rainwave_dto import Api4AdminOrderPowerHourSongsPostRequest
from api import fieldtypes

from common.db.cursor import get_cursor


@handle_api_url("admin/order_power_hour_songs")
class OrderPowerHourSongs(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_power_hour"

    admin_required = True
    sid_required = False

    async def post(self):
        input = self.get_validated_input(Api4AdminOrderPowerHourSongsPostRequest)
        order_ids = fieldtypes.integer_list(input.order)
        if order_ids is None:
            raise APIException(
                "invalid_argument",
                argument="order",
                reason="must be a comma-separated list of integers.",
                status_code=400,
            )
        async with get_cursor() as cursor:
            await get_power_hour_by_id(cursor, input.sched_id)
            existing_ids = await cursor.fetch_list(
                "SELECT one_up_id FROM r4_one_ups WHERE sched_id = %s ORDER BY one_up_order",
                (input.sched_id,),
                row_type=int,
            )
            if sorted(existing_ids) != sorted(order_ids):
                raise APIException(
                    "invalid_argument",
                    "Submitted Power Hour song order does not match the existing queue.",
                )
            for order, one_up_id in enumerate(order_ids):
                await cursor.update(
                    "UPDATE r4_one_ups SET one_up_order = %s WHERE one_up_id = %s",
                    (order, one_up_id),
                )
            self.response["admin_power_hour"] = await get_api_power_hour(
                cursor, input.sched_id
            )
