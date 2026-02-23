from typing import cast
from api.web import APIHandler
from api.exceptions import APIException
from api import fieldtypes
from api.handle_url import handle_api_url
import routes.vote
import routes.playlist
import routes.tune_in
from common.rainwave.events.event import BaseEvent

from libs import cache
from common import config


@handle_api_url("info")
class InfoRequest(APIHandler):
    auth_required = False
    description = "Returns current user and station information.  all_albums will append a list of all albums to the request (will slow down your request).  current_listeners will add a list of all current listeners to your request."
    fields = {
        "all_albums": (fieldtypes.boolean, False),
        "current_listeners": (fieldtypes.boolean, False),
    }
    allow_get = True
    allow_cors = True

    def post(self):
        attach_info_to_request(self)
