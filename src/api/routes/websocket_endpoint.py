import time

import orjson
import datetime
from typing import Any, cast
import numbers
import sys
import uuid
from time import time as timestamp

from tornado import httputil
from tornado.httputil import HTTPConnection

from api import fieldtypes
from api.exceptions import APIException
from api.helpers.get_station_info import get_station_info
from api.helpers.get_browser_locale import get_browser_locale
from api.handle_url import api_endpoints, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.get_remote_ip_or_throw import get_remote_ip_or_throw
from api.helpers.user_to_api_private import user_to_api_private
from api.rainwave_return_key_to_open_api import RainwaveResponse
from api.websocket.rainwave_websocket_handler import RainwaveWebsocketHandler
from api.websocket.websocket_message import RainwaveWebsocketMessage
from api.websocket.websocket_tracker.websocket_tracker import websockets_by_sid
from common import config, stations
from common import log
from common.cache.station_cache import cache_get_station
from common.cache.timeline_cache import get_timeline_api_cache
from common.db.cursor import get_cursor
from common.locale.rainwave_locale import RainwaveLocale
from common.user.model.user_base import UserBase
from common.zeromq import zeromq
import tornado
from common.locale.locale import translations


class _WebsocketApiConnectionBridge:
    _close_callback: Any = None

    def set_close_callback(self, callback: Any) -> None:
        self._close_callback = callback


nonunique_actions = (
    "request",
    "delete_request",
    "fave_song",
    "fave_album",
    "rate",
    "clear_rating",
)
throttle_exempt = (
    "all_albums_paginated",
    "all_groups_paginated",
    "all_artists_paginated",
)


@handle_api_url(r"websocket/(\d+)")
class WebsocketEndpoint(RainwaveWebsocketHandler):
    user: UserBase | None = None
    rainwave_locale: RainwaveLocale = translations["en-CA"]

    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)

        # Required for parent class
        self.uuid = str(uuid.uuid4())
        self.sid = config.default_station
        self.user_id = 1
        self.listen_key = ""

        # Variables for this class
        self.remote_ip = get_remote_ip_or_throw(self.request.remote_ip)
        self.msg_times: list[float] = []
        self.throttled = False
        self.throttled_msgs: list[RainwaveWebsocketMessage] = []

    # This function called by Tornado after connection is establed, with
    # args/kwargs coming from the URL.
    def open(self, *args: Any, **kwargs: Any):
        super().open(*args, **kwargs)

        try:
            self.sid = int(args[0])
        except Exception:
            # Keep self.sid at default
            pass

        if not self.sid in stations.station_ids:
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "invalid_station_id",
                        "text": self.rainwave_locale.translate("invalid_station_id"),
                    }
                }
            )
            return

        self.rainwave_locale = get_browser_locale(self)

    def on_close(self):
        self.throttled_msgs = []
        websockets_by_sid[self.sid].remove(self)

    async def process_throttle(self):
        if not self.throttled_msgs or not self.user:
            self.throttled = False
            return

        self.throttled_msgs.sort()
        # log.debug("throttle", "Throttled with %s messages" % len(self.throttled_msgs))
        action = self.throttled_msgs[0]["action"]
        msg = None
        if not action in nonunique_actions:
            msgs = [m for m in self.throttled_msgs if m["action"] == action]
            msg = msgs.pop()
            for m in msgs:
                message_id = fieldtypes.zero_or_greater_integer(m.get("message_id", 0))
                if message_id:
                    self.write_rainwave_response(
                        {
                            "wsthrottle": {
                                "tl_key": "websocket_throttle",
                                "text": self.rainwave_locale.translate(
                                    "websocket_throttle"
                                ),
                            },
                            "message_id": {
                                "message_id": message_id,
                            },
                        }
                    )
            self.throttled_msgs = [
                m for m in self.throttled_msgs if m["action"] != action
            ]
            # log.debug("throttle", "Handling last throttled %s message." % action)
        else:
            msg = self.throttled_msgs.pop(0)
            # log.debug("throttle", "Handling last throttled %s message." % action)
        if msg:
            await self._process_message(msg, self.user, is_throttle_process=True)
        tornado.ioloop.IOLoop.instance().add_timeout(
            datetime.timedelta(seconds=0.5), self.process_throttle
        )

    async def on_message(self, message: str | bytes) -> None:
        try:
            parsed_json = orjson.loads(message)
        except:
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "invalid_request",
                        "text": "Invalid JSON sent on websocket.",
                    }
                }
            )
            return

        rw_message = RainwaveWebsocketMessage()
        rw_message.update(parsed_json)
        if not rw_message.get("action"):
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.rainwave_locale.translate(
                            "missing_argument",
                            {"argument": "action"},
                        ),
                    }
                }
            )
            return

        user = self.user
        if rw_message["action"] == "auth":
            await self._process_message(rw_message, None)
            if self.user:
                await self._station_offline_check()
            return
        elif user is None:
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "auth_required",
                        "text": self.rainwave_locale.translate("auth_required"),
                    }
                }
            )
            return

        await self._process_message(rw_message, user)

    async def _process_message(
        self,
        message: RainwaveWebsocketMessage,
        user: UserBase | None,
        is_throttle_process: bool = False,
    ) -> None:
        message_id = fieldtypes.zero_or_greater_integer(message.get("message_id", None))

        throt_t = timestamp() - 3
        self.msg_times = [t for t in self.msg_times if t > throt_t]

        if not is_throttle_process and message["action"] not in throttle_exempt:
            self.msg_times.append(timestamp())
            # log.debug("throttle", "%s - %s" % (len(self.msg_times), message['action']))
            if self.throttled:
                # log.debug("throttle", "Currently throttled, adding to queue.")
                self.throttled_msgs.append(message)
                return
            elif len(self.msg_times) >= 5:
                # log.debug("throttle", "Too many messages, throttling.")
                self.throttled = True
                self.throttled_msgs.append(message)
                tornado.ioloop.IOLoop.instance().add_timeout(
                    datetime.timedelta(seconds=0.5), self.process_throttle
                )
                return

        if message["action"] == "check_sched_current_id":
            await self._do_sched_check(message)
            return
        if message["action"] == "ping":
            response: RainwaveResponse = {"pong": True}
            if message_id:
                response["message_id"] = {"message_id": message_id}
            self.write_rainwave_response(response)
            return

        api_endpoint = "/api4/%s" % message["action"]
        endpoint_class = api_endpoints.get(api_endpoint, None)
        if endpoint_class is None or not issubclass(endpoint_class, APIHandler):
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "404",
                        "text": self.rainwave_locale.translate("404"),
                    }
                }
            )
            return

        # Twisting types a little to get an Tornado API handler to behave in our
        # little dual HTTP API-or-Websocket world.
        request = httputil.HTTPServerRequest(method="POST", uri=message["action"])
        request.connection = cast(HTTPConnection, _WebsocketApiConnectionBridge())

        endpoint = endpoint_class(
            self.application,
            request,
            websocket_handling=True,
            websocket_message=message,
            websocket_user=self.user,
            websocket_sid=(
                message["sid"] if ("sid" in message and message["sid"]) else self.sid
            ),
            websocket_locale=self.rainwave_locale,
            websocket_uuid=self.uuid,
            websocket_remote_ip=self.remote_ip,
        )
        api_return_success = False

        try:
            await endpoint.prepare()
            await endpoint.post()

            if message["action"] == "auth" and endpoint.optional_user:
                self.user = endpoint.optional_user
                self.user_id = self.user.id
                self.listen_key = self.user.private_data["listen_key"]
                self.authorized = True
                self.uuid = str(uuid.uuid4())
                websockets_by_sid[self.sid].append(self)

            endpoint.response["api_info"] = {
                "exectime": time.monotonic() - endpoint.startclock,
                "time": int(timestamp()),
            }

            api_return = endpoint.response.get(endpoint.return_name, None)
            api_return_success = (
                True
                if (
                    api_return
                    and isinstance(api_return, dict)
                    and api_return.get("success", False) == True
                )
                else False
            )
            if (
                endpoint.sync_across_sessions
                and api_return_success
                and user is not None
            ):
                zeromq.publish(
                    {
                        "action": "result_sync",
                        "sid": self.sid,
                        "user_id": user.id,
                        "data": endpoint.response,
                        "uuid_exclusion": self.uuid,
                    }
                )

        except APIException as e:
            endpoint.write_error(e.status_code, exc_info=sys.exc_info(), no_finish=True)
            if e.status_code == 500:
                log.exception("websocket", "API Exception during operation.", e)
        except Exception as e:
            endpoint.write_error(500, exc_info=sys.exc_info(), no_finish=True)
            log.exception("websocket", "API Exception during operation.", e)
        finally:
            if message_id:
                endpoint.response["message_id"] = {"message_id": message_id}
            self.write_rainwave_response(endpoint.response)

    async def update(self):
        if not await cache_get_station(self.sid, "backend_ok"):
            self.write_rainwave_response(
                {
                    "sync_result": {
                        "code": 403,
                        "success": False,
                        "text": self.rainwave_locale.translate("station_offline"),
                        "tl_key": "station_offline",
                    }
                }
            )
            return

        try:
            async with get_cursor() as cursor:
                startclock = time.monotonic()
                response = await get_station_info(
                    cursor,
                    self.user,
                    self.sid,
                    include_request_line=True,
                    include_live_voting=True,
                )
                if self.user:
                    response["user"] = user_to_api_private(self.user)
                response["api_info"] = {
                    "exectime": time.monotonic() - startclock,
                    "time": int(timestamp()),
                }
                self.write_rainwave_response(response)
        except Exception as e:
            try:
                self.write_rainwave_response(
                    {
                        "sync_result": {
                            "code": 500,
                            "success": False,
                            "text": self.rainwave_locale.translate("internal_error"),
                            "tl_key": "internal_error",
                        }
                    }
                )
            except Exception:
                pass
            log.exception("websocket", "Exception during update.", e)

    async def update_user_data_only(self):
        if self.user:
            async with get_cursor() as cursor:
                await self.user.refresh(cursor)
            self.write_rainwave_response({"user": user_to_api_private(self.user)})

    async def _station_offline_check(self):
        if not await cache_get_station(self.sid, "backend_ok"):
            # shamelessly fake an error.
            self.write_rainwave_response(
                {
                    "sync_result": {
                        "tl_key": "station_offline",
                        "text": self.rainwave_locale.translate("station_offline"),
                    }
                }
            )

    async def _do_sched_check(self, message: RainwaveWebsocketMessage) -> None:
        if not "sched_id" in message or not message["sched_id"]:
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.rainwave_locale.translate(
                            "missing_argument", {"argument": "sched_id"}
                        ),
                    }
                }
            )
            return
        if not isinstance(message["sched_id"], numbers.Number):
            self.write_rainwave_response(
                {
                    "wserror": {
                        "tl_key": "invalid_argument",
                        "text": self.rainwave_locale.translate(
                            "invalid_argument", {"argument": "sched_id"}
                        ),
                    }
                }
            )
            return

        await self._station_offline_check()

        timeline = await get_timeline_api_cache(self.sid)
        if timeline[0] and timeline[0]["sched_current"]["id"] != message["sched_id"]:
            await self.update()
