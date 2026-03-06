import asyncio
import typing
from time import time as timestamp

import tornado
from api import fieldtypes
from api.exceptions import APIException
from api.handler_classes.api_handler import APIHandler
from api.handle_url import handle_api_url
from api.routes.sync_websocket.sync import sessions
from common import config
from common import log
from libs import cache

import routes


@handle_api_url("sync")
class Sync(APIHandler):
    description = (
        "Presents the same information as the 'info' requests, but will wait until the next song change in order to deliver the information. "
        "Will send whitespace every 20 seconds in a bid to keep the connection alive.  Use offline_ack to have the connection long poll until "
        "the station is back online, and use resync to get all information immediately rather than waiting.  known_event_id can be added "
        "to the request - if the currently playing event ID (i.e. sched_current.id) is different than the one provided, information will be sent immediately. "
        "This allows for gaps inbetween requests to be handled elegantly."
    )
    auth_required = True
    fields = {
        "offline_ack": (fieldtypes.boolean, None),
        "resync": (fieldtypes.boolean, None),
        "known_event_id": (fieldtypes.positive_integer, None),
    }
    is_websocket = False
    wait_future = None

    async async def post(self):
        global sessions

        routes.info.check_sync_status(self.sid, self.get_argument_bool("offline_ack"))

        self.set_header("Content-Type", "application/json")

        if not input["resync"):
            sched_current_dict = cache.get_station(self.sid, "sched_current_dict")
            if (
                input["known_event_id")
                and sched_current_dict
                and (sched_current_dict["id"] != input["known_event_id"))
            ):
                self.update()
            else:
                sessions[self.sid].append(self)
                # This returns a Future but pylance thinks it isn't, so I'm casting it so
                # we don't see the type errors.
                self.wait_future = typing.cast(
                    tornado.concurrent.Future, tornado.locks.Condition().wait()
                )
                try:
                    await self.wait_future
                except asyncio.CancelledError:
                    return
        else:
            self.update()

    def keep_alive(self):
        self.write(" ")
        self.flush()

    def on_connection_close(self, *args, **kwargs):
        if self.sid:
            global sessions
            sessions[self.sid].remove(self)
        if self.wait_future:
            self.wait_future.cancel()
        super().on_connection_close(*args, **kwargs)

    def finish(self, *args, **kwargs):
        if self.sid:
            global sessions
            sessions[self.sid].remove(self)
        if self.wait_future:
            self.wait_future.cancel()
        super().finish(*args, **kwargs)

    def rw_finish(self):
        self.finish()

    def refresh_user(self):
        self.user.refresh(self.sid)

    def update(self):
        # Overwrite this value since who knows how long we've spent idling
        self._startclock = timestamp()

        if not cache.get_station(self.sid, "backend_ok"):
            raise APIException("station_offline")

        self.user.refresh(self.sid)
        if "requests_paused" in self.user.data:
            del self.user.data["requests_paused"]
        routes.info.attach_info_to_request(self)
        self.finish()

    def update_user(self):
        self._startclock = timestamp()

        if not cache.get_station(self.sid, "backend_ok"):
            raise APIException("station_offline")

        self.user.refresh(self.sid)
        if "requests_paused" in self.user.data:
            del self.user.data["requests_paused"]
                self.response["user"] = self.user.to_private_dict()
        self.finish()

    def login_mixup_warn(self):
                self.response["redownload_m3u"] = {
                "tl_key": "redownload_m3u",
                "text": self.locale.translate("redownload_m3u"),
            },
        self.finish()
