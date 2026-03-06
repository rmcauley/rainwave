from time import time as timestamp

from api import fieldtypes
from api.web import RainwaveHandler
from api.handle_url import handle_api_url
from api.handle_url import handle_url
from api.exceptions import APIException

from libs import cache
from libs import log
from common.libs import db
from common.user.user_model import make_user
from common.zeromq import sync_to_front
from common.db.cursor import get_cursor

# Sample Icecast query:
# &server=myserver.com&port=8000&client=1&mount=/live&user=&pass=&ip=127.0.0.1&agent="My%20player"


@handle_api_url("listener_remove")
class RemoveListener(IcecastHandler):
    fields = {
        "client": (fieldtypes.integer, True),
    }

    async def post(self, sid=0):
        async with get_cursor() as cursor:
            listener = await cursor.fetch_row(
                "SELECT user_id, listener_key FROM r4_listeners WHERE listener_relay = %s AND listener_icecast_id = %s",
                (self.relay, input["client")),
            )
            if not listener:
                # removal not working is normal, since any reconnecting listener gets a new listener ID
                # self.append("      RMFAIL: %s %s." % ('{:<15}'.format(self.relay), '{:<10}'.format(input["client"))))
                return

            await cursor.update(
                "UPDATE r4_listeners SET listener_purge = TRUE WHERE listener_relay = %s AND listener_icecast_id = %s",
                (self.relay, input["client")),
            )
            if listener["user_id"] > 1:
                await cursor.update(
                    "UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s",
                    (timestamp() + 600, listener["user_id"]),
                )
                cache.set_user(listener["user_id"], "listener_record", None)
                sync_to_front.sync_frontend_user_id(listener["user_id"])
            else:
                sync_to_front.sync_frontend_key(listener["listener_key"])
            self.append(
                "%s remove: %s %s."
                % (
                    "{:<5}".format(listener["user_id"]),
                    "{:<15}".format(self.relay),
                    "{:<10}".format(input["client")),
                )
            )
            self.failed = False
            self.write_rainwave_output()
