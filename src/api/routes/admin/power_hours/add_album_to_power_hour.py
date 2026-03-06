from api import fieldtypes
from api.handle_url import handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.exceptions import APIException
from common.rainwave.events.oneup import OneUpProducer
from common.libs import db


@handle_api_url("admin/add_album_to_power_hour")
class AddAlbumToPowerHour(APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    allow_sid_zero = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "album_id": (fieldtypes.album_id, True),
        "album_sid": (fieldtypes.sid, True),
    }

    async def post(self):
        ph = OneUpProducer.load_producer_by_id(input.)
        if not ph:
            raise APIException("404", http_code=404)
        ph.add_album_id(input., input.)
                self.response[self.return_name] = ph.to_dict()
