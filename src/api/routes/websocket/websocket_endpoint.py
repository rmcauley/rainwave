import time

import orjson
import datetime
from typing import Any
import numbers
import sys
import uuid
from time import time as timestamp

from tornado import httputil

from api import fieldtypes
from api.exceptions import APIException
from api.helpers.get_station_info import get_station_info
from api.helpers.get_browser_locale import get_browser_locale
from api.handle_url import api_endpoints, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.helpers.get_remote_ip_or_throw import get_remote_ip_or_throw
from api.helpers.user_to_api_private import user_to_api_private
from api.routes.websocket.vote_throttle_service.vote_throttle_service import (
    vote_throttle_service,
)
from api.routes.websocket.rainwave_websocket_handler import RainwaveWebsocketHandler
from api.routes.websocket.websocket_message import RainwaveWebsocketMessage
from api.routes.websocket.websocket_tracker.websocket_tracker import websockets_by_sid
from common import config, stations
from common import log
from common.cache.station_cache import cache_get_station
from common.cache.timeline_cache import get_timeline_api_cache
from common.db.cursor import get_cursor
from common.locale.rainwave_locale import RainwaveLocale
from common.user.get_anonymous_user import get_authorized_anonymous_user
from common.user.get_registered_user import get_authorized_registered_user
from common.user.model.user_base import UserBase
from common.zeromq import zeromq
import tornado
from common.locale.locale import translations


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
    user: UserBase | None
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
        self.votes_by_key = ""

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

    def should_vote_throttle(self) -> float:
        return vote_throttle_service.seconds_until_live_broadcast_allowed(
            self.votes_by_key
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
            await self._do_auth(rw_message)
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
        user: UserBase,
        is_throttle_process: bool = False,
    ) -> None:
        # TODO: what did we used to do with message_id?
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

        if message["action"] == "vote":
            # TODO: how does this interface with the vote throttle service
            zeromq.publish({"action": "vote_by", "by": self.votes_by_key})

        if message["action"] == "check_sched_current_id":
            await self._do_sched_check(message)
            return

        message["action"] = "/api4/%s" % message["action"]
        endpoint_class = api_endpoints.get(message["action"], None)
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

        # it's required to see if another person on the same IP address has overriden the vote
        # for the in-memory user here, so it requires a DB fetch.
        if message["action"] == "/api4/vote" and user.is_anonymous():
            async with get_cursor() as cursor:
                await user.refresh(cursor)

        endpoint = endpoint_class(
            self.application,
            httputil.HTTPServerRequest(
                method="POST", connection=httputil.HTTPConnection()
            ),
            websocket_handling=True,
            websocket_message=message,
            websocket_user=self.user,
            websocket_sid=(
                message["sid"] if ("sid" in message and message["sid"]) else self.sid
            ),
            websocket_locale=self.rainwave_locale,
            websocket_uuid=self.uuid,
        )
        api_return_success = False

        try:
            await endpoint.prepare()
            await endpoint.post()

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
            if endpoint.sync_across_sessions and api_return_success:
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

    def update_user(self):
        if self.user:
            self.write_rainwave_response({"user": user_to_api_private(self.user)})

    async def _do_auth(self, message: RainwaveWebsocketMessage) -> None:
        try:
            if not "user_id" in message or not message["user_id"]:
                self.write_rainwave_response(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument", {"argument": "user_id"}
                            ),
                        }
                    }
                )
            if not isinstance(message["user_id"], numbers.Number):
                self.write_rainwave_response(
                    {
                        "wserror": {
                            "tl_key": "invalid_argument",
                            "text": self.rainwave_locale.translate(
                                "invalid_argument", {"argument": "user_id"}
                            ),
                        }
                    }
                )
            if not "key" in message or not message["key"]:
                self.write_rainwave_response(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument", {"argument": "key"}
                            ),
                        }
                    }
                )

            try:
                async with get_cursor() as cursor:
                    if message["user_id"] == 1:
                        self.user = await get_authorized_registered_user(
                            cursor,
                            self.sid,
                            message["user_id"],
                            message["key"],
                            self.remote_ip,
                        )
                    else:
                        self.user = await get_authorized_anonymous_user(
                            cursor, self.sid, 1, message["key"], self.remote_ip
                        )
            except APIException as auth_error:
                if auth_error.tl_key == "auth_failed":
                    self.write_rainwave_response(
                        {
                            "wserror": {
                                "tl_key": "auth_failed",
                                "text": self.rainwave_locale.translate("auth_failed"),
                            }
                        }
                    )
                    self.close()
                    return
            self.authorized = True
            self.uuid = str(uuid.uuid4())

            websockets_by_sid[self.sid].append(self)

            self.write_rainwave_response({"wsok": True})
            # since this will be the first action in any websocket interaction though,
            # it'd be a good time to send a station offline message.
            await self._station_offline_check()
        except Exception as e:
            log.exception("websocket", "Exception during authentication.", e)
            self.close()

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

        await self._station_offline_check()

        timeline = await get_timeline_api_cache(self.sid)
        if timeline[0] and timeline[0]["sched_current"]["id"] != message["sched_id"]:
            await self.update()
