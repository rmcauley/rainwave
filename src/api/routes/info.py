from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.get_station_info import get_station_info
from common.db.cursor import get_cursor


@handle_api_url("info")
class InfoRequest(APIHandler):
    auth_required = False
    description = "Returns current user and station information."
    allow_cors = True

    async def post(self):
        async with get_cursor() as cursor:
            self.response.update(
                await get_station_info(
                    cursor, self.optional_user, self.sid, False, False
                )
            )
