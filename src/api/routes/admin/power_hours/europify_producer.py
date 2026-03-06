from datetime import datetime, timedelta
from pytz import timezone

from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.libs import db
from common.rainwave.events.event import BaseProducer
from common.db.cursor import get_cursor


@handle_api_url("admin/europify_producer")
class EuropifyProducer(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    async def post(self):
        async with get_cursor() as cursor:
            producer = BaseProducer.load_producer_by_id(input.)
            if not producer:
                raise APIException(
                    "internal_error",
                    "Producer ID %s not found." % input.,
                )
            new_producer = producer.duplicate()
            new_producer.name += " Reprisal"
            start_eu = datetime.fromtimestamp(producer.start, timezone("UTC")).replace(
                tzinfo=timezone("Europe/London")
            ).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
            start_epoch_eu = int(
                (start_eu - datetime.fromtimestamp(0, timezone("UTC"))).total_seconds()
            )
            new_producer.change_start(start_epoch_eu)
            await cursor.update(
                "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
                (new_producer.name, new_producer.id),
            )
                    self.response[self.return_name] = new_producer.to_dict()
