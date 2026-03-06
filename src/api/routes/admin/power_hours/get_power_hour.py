from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from common.rainwave.events.oneup import OneUpProducer


@handle_api_url("admin/get_power_hour")
class GetPowerHour(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    async def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if ph:
            self.response[self.return_name] = ph.to_dict()
        else:
            self.response[self.return_name] = None
        self.write_rainwave_output()
