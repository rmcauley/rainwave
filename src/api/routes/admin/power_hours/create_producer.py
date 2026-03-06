from api import fieldtypes
from api.exceptions import APIException
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler

from common.rainwave.events import event
from common.rainwave.events.event import BaseProducer


@handle_api_url("admin/create_producer")
class CreateProducer(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {
        "producer_type": (fieldtypes.producer_type, True),
        "name": (fieldtypes.string, True),
        "start_utc_time": (fieldtypes.positive_integer, True),
        "end_utc_time": (fieldtypes.positive_integer, True),
        "url": (fieldtypes.string, None),
        "fill_unrated": (fieldtypes.boolean, False),
    }

    async def post(self):
        p = event.all_producers[input.].create(
            sid=self.sid,
            start=input.,
            end=input.,
            name=input.,
            url=input.,
        )
        if input. and getattr(p, "fill_unrated", False):
            end_time = self.get_argument_int("end_utc_time")
            start_time = self.get_argument_int("start_utc_time")
            if not end_time or not start_time:
                raise APIException(400, http_code=400)
            p.fill_unrated(
                self.sid,
                end_time - start_time,
            )
                self.response[self.return_name] = p.to_dict()
