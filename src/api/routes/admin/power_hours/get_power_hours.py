from time import time as timestamp

from api import rainwave_typeddicts
from api.handle_url import handle_api_url
from api.rainwave_return_key_to_open_api import RainwaveResponseKey
from api.handler_classes.api_handler import APIHandler

from common.db.cursor import get_cursor

@handle_api_url("admin/power_hours")
class GetPowerHours(APIHandler):

    @property
    def return_name(self) -> RainwaveResponseKey:
        return "admin_power_hours"
    admin_required = True
    sid_required = False

    async def post(self):
        async with get_cursor() as cursor:
            power_hours = await cursor.fetch_all(
                """
                SELECT r4_schedule.*
                FROM r4_schedule
                WHERE sched_used = FALSE AND sched_start >= %s AND sched_type = 'OneUpProducer'
                ORDER BY sched_start DESC
                """,
                (timestamp() - (86400 * 32),),
                row_type=rainwave_typeddicts.AdminPowerHour,
            )
            # The songs[] are not actually defined in the SQL, so let's add them here.
            # A hack, but it works while keeping the types simple.
            for power_hour in power_hours:
                power_hour["songs"] = []
            self.response["admin_power_hours"] = power_hours
