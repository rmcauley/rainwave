from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from common.rainwave.events.event import BaseProducer


@handle_api_url("admin/duplicate_producer")
class DuplicateProducer(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    async def post(self):
        producer = BaseProducer.load_producer_by_id(input.)
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % input.,
            )
        new_producer = producer.duplicate()
                self.response[self.return_name] = new_producer.to_dict()
