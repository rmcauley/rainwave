from datetime import datetime, timedelta
from pytz import timezone
from time import time as timestamp
from common.libs import db
import api.web
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.exceptions import APIException
from api import fieldtypes
from common.rainwave.events import event
from common.rainwave.events.event import BaseProducer
from common.db.cursor import get_cursor


@handle_api_url("admin/delete_producer")
class DeleteProducer(APIHandler):
    admin_required = True
    sid_required = False
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    async def post(self):
        async with get_cursor() as cursor:
            producer = BaseProducer.load_producer_by_id(input.)
            if not producer:
                raise APIException(
                    "internal_error",
                    "Producer ID %s not found." % input.,
                )
            await cursor.update(
                "DELETE FROM r4_schedule WHERE sched_id = %s",
                (input.,),
            )
            self.append_standard("success", "Producer deleted.")
            self.write_rainwave_output()
