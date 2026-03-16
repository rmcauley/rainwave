from typing import Any

from pydantic import BaseModel, field_validator

from api.handle_url import handle_api_url
from api.handler_classes.registered_user_handler import RegisteredUserAPIHandler
from common.db.cursor import get_cursor
from common.requests.get_user_requests import get_user_requests, user_requests_to_api


class OrderRequestsDto(BaseModel):
    order: list[int]

    @field_validator("order", mode="before")
    @classmethod
    def validate_order(cls, value: Any) -> list[int]:
        if isinstance(value, bytes):
            value = value.decode().strip()
        if not isinstance(value, str):
            raise TypeError("order must be a comma-separated list of integers")

        if not value:
            raise ValueError("order must be a comma-separated list of integers")

        order: list[int] = []
        for entry in value.split(","):
            if not entry.isdigit():
                raise ValueError("order must be a comma-separated list of integers")
            order.append(int(entry))
        return order


@handle_api_url("order_requests")
class OrderRequests(RegisteredUserAPIHandler):
    description = "Change the order of requests in the user's queue.  Submit a comma-separated list of Song IDs, in desired order."
    login_required = True
    tunein_required = False
    unlocked_listener_only = False
    sync_across_sessions = True

    async def post(self):
        input = self.get_validated_input(OrderRequestsDto)
        async with get_cursor() as cursor:
            for order, song_id in enumerate(input.order):
                await cursor.update(
                    "UPDATE r4_request_store SET reqstor_order = %s WHERE user_id = %s AND song_id = %s",
                    (order, self.user.id, song_id),
                )
            self.response["order_requests_result"] = {
                "success": True,
                "text": self.rainwave_locale.translate("requests_reordered"),
                "tl_key": "requests_reordered",
            }
            song_requests = await get_user_requests(cursor, self.sid, self.user.id)
            self.response["requests"] = user_requests_to_api(song_requests)
