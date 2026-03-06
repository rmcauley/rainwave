from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from common.rainwave.events.event import BaseProducer


@handle_api_url("admin/change_producer_start_time")
class ChangeProducerStartTime(APIHandler):
    return_name = "producer"
    admin_required = True
    sid_required = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "utc_time": (fieldtypes.positive_integer, True),
    }

    async def post(self):
        producer = BaseProducer.load_producer_by_id(input.)
        if not producer:
            raise APIException("404", http_code=404)
        producer.change_start(input.)
                self.response[self.return_name] = producer.to_dict()
