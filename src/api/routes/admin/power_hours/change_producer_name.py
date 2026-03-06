from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from common.libs import db
from common.rainwave.events.event import BaseProducer
from common.db.cursor import get_cursor


@handle_api_url("admin/change_producer_name")
class ChangeProducerName(APIHandler):
    admin_required = True
    sid_required = False
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "name": (fieldtypes.string, True),
    }

    async def post(self):
        async with get_cursor() as cursor:
            producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
            if not producer:
                raise APIException(
                    "internal_error",
                    "Producer ID %s not found." % self.get_argument("sched_id"),
                )
            await cursor.update(
                "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
                (self.get_argument("name"), self.get_argument("sched_id")),
            )
            self.append_standard(
                "success", "Producer name changed to '%s'." % self.get_argument("name")
            )
            self.write_rainwave_output()
