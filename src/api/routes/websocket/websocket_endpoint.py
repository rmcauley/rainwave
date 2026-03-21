import orjson
import datetime
from typing import Any
import numbers
import sys
import uuid
from time import time as timestamp
from urllib.parse import urlparse

from tornado.websocket import WebSocketClosedError, WebSocketError

from api import fieldtypes
from api.exceptions import APIException
from api.helpers.get_browser_locale import get_browser_locale
from api.handle_url import api_endpoints, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.rainwave_return_key_to_open_api import RainwaveResponse
from api.routes.websocket.fake_request_object import FakeRequestObject
from api.routes.websocket.rainwave_websocket_handler import RainwaveWebsocketHandler
from api.routes.websocket.websocket_message import RainwaveWebsocketMessage
from api.routes.websocket.websocket_tracker import websockets_by_sid
from common import config, stations
from common import log
from common.locale.rainwave_locale import RainwaveLocale
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
        self.authorized = False
        self.msg_times: list[float] = []
        self.throttled = False
        self.throttled_msgs: list[RainwaveWebsocketMessage] = []
        self.votes_by_key = ""

    def check_origin(self, origin: str) -> bool:
        if config.websocket_allow_from == "*":
            return True
        parsed_origin = urlparse(origin)
        return parsed_origin.netloc.endswith(config.websocket_allow_from)

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
            self.write_message(
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

    def write_rainwave_response(self, data: RainwaveResponse) -> None:
        message = orjson.dumps(data)
        try:
            self.write_message(message)
        except WebSocketClosedError:
            self.on_close()
        except WebSocketError as e:
            log.exception("websocket", "WebSocket Error", e)
            self.on_close()
            self.close()

    def process_throttle(self):
        if not self.throttled_msgs:
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
                if "message_id" in m and fieldtypes.zero_or_greater_integer(
                    m["message_id"]
                ):
                    self.write_message(
                        {
                            "wsthrottle": {
                                "tl_key": "websocket_throttle",
                                "text": self.rainwave_locale.translate(
                                    "websocket_throttle"
                                ),
                            },
                            "message_id": {
                                "message_id": fieldtypes.zero_or_greater_integer(
                                    m["message_id"]
                                ),
                                "success": False,
                                "tl_key": "websocket_throttle",
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
            self._process_message(msg, is_throttle_process=True)
        tornado.ioloop.IOLoop.instance().add_timeout(
            datetime.timedelta(seconds=0.5), self.process_throttle
        )

    def should_vote_throttle(self) -> int:
        if not self.votes_by_key in votes_by:
            return 0

        vote_limit = 3
        if (votes_by[self.votes_by_key] >= vote_limit) and (
            timestamp() < (last_vote_by[self.votes_by_key] + vote_once_every_seconds)
        ):
            return (
                last_vote_by[self.votes_by_key] + vote_once_every_seconds
            ) - timestamp()
        return 0

    def on_message(self, message: str | bytes) -> None:
        try:
            parsed_json = orjson.loads(message)
        except:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "invalid_json",
                        "text": "Invalid JSON sent on websocket.",
                    }
                }
            )
            return

        if not rw_message.get("action"):
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.rainwave_locale.translate(
                            "missing_argument", argument="action"
                        ),
                    }
                }
            )
            return

        if not self.authorized and rw_message["action"] != "auth":
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "auth_required",
                        "text": self.rainwave_locale.translate("auth_required"),
                    }
                }
            )
            return

        if not self.authorized and rw_message["action"] == "auth":
            self._do_auth(rw_message)
            return

        if rw_message["action"] == "vote":
            if not rw_message["entry_id"]:
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument", argument="entry_id"
                            ),
                        }
                    }
                )
            elif not fieldtypes.integer(rw_message["entry_id"]):
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "invalid_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument",
                                argument="entry_id",
                                reason=fieldtypes.integer_error,
                            ),
                        }
                    }
                )
            rw_message["elec_id"] = rainwave.schedule.get_elec_id_for_entry(
                self.sid, rw_message["entry_id"]
            )

        self._process_message(rw_message)

    def _process_message(self, message, is_throttle_process=False):
        message_id = None
        if "message_id" in message:
            message_id = fieldtypes.zero_or_greater_integer(message["message_id"])

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

        if message["action"] == "ping":
            self.write_message({"pong": {"timestamp": timestamp()}})
            return

        if message["action"] == "pong":
            self.write_message({"pongConfirm": {"timestamp": timestamp()}})
            return

        if message["action"] == "vote":
            zeromq.publish({"action": "vote_by", "by": self.votes_by_key})

        if message["action"] == "check_sched_current_id":
            self._do_sched_check(message)
            return

        message["action"] = "/api4/%s" % message["action"]
        if not message["action"] in api_endpoints:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "websocket_404",
                        "text": self.rainwave_locale.translate("websocket_404"),
                    }
                }
            )
            return

        endpoint = api_endpoints[message["action"]](websocket=True)
        endpoint.locale = self.rainwave_locale
        endpoint.request = FakeRequestObject(message, self.request.cookies)
        endpoint.sid = (
            message["sid"] if ("sid" in message and message["sid"]) else self.sid
        )
        endpoint.user = self.user
        endpoint._startclock = timestamp()
        try:
            # it's required to see if another person on the same IP address has overriden the vote
            # for the in-memory user here, so it requires a DB fetch.
            if message["action"] == "/api4/vote" and self.user.is_anonymous():
                self.user.refresh(self.sid)
            if "message_id" in message:
                if message_id == None:
                    endpoint.prepare_standalone()
                    raise APIException(
                        "invalid_argument",
                        argument="message_id",
                        reason=fieldtypes.zero_or_greater_integer_error,
                        http_code=400,
                    )
                endpoint.prepare_standalone(message_id)
            else:
                endpoint.prepare_standalone()
            endpoint.post()
            endpoint.append(
                "api_info",
                {
                    "exectime": timestamp() - endpoint._startclock,
                    "time": round(timestamp()),
                },
            )
            if endpoint.sync_across_sessions:
                if (
                    endpoint.return_name in endpoint._output
                    and isinstance(endpoint._output[endpoint.return_name], dict)
                    and not endpoint._output[endpoint.return_name]["success"]
                ):
                    pass
                else:
                    zeromq.publish(
                        {
                            "action": "result_sync",
                            "sid": self.sid,
                            "user_id": self.user.id,
                            "data": endpoint._output,
                            "uuid_exclusion": self.uuid,
                        }
                    )
            if (
                message["action"] == "/api4/vote"
                and endpoint.return_name in endpoint._output
                and isinstance(endpoint._output[endpoint.return_name], dict)
                and endpoint._output[endpoint.return_name]["success"]
            ):
                live_voting = rainwave.schedule.update_live_voting(self.sid)
                endpoint.append("live_voting", live_voting)
                if self.should_vote_throttle():
                    zeromq.publish(
                        {
                            "action": "delayed_live_voting",
                            "sid": self.sid,
                            "uuid_exclusion": self.uuid,
                            "data": {"live_voting": live_voting},
                        }
                    )
                else:
                    zeromq.publish(
                        {
                            "action": "live_voting",
                            "sid": self.sid,
                            "uuid_exclusion": self.uuid,
                            "data": {"live_voting": live_voting},
                        }
                    )
        except APIException as e:
            endpoint.write_error(e.code, exc_info=sys.exc_info(), no_finish=True)
            if e.code != 200:
                log.exception("websocket", "API Exception during operation.", e)
        except Exception as e:
            endpoint.write_error(500, exc_info=sys.exc_info(), no_finish=True)
            log.exception("websocket", "API Exception during operation.", e)
        finally:
            self.write_message(endpoint._output)

    def update(self):
        handler = APIHandler(websocket=True)
        handler.locale = self.rainwave_locale
        handler.request = typing.cast(
            tornado.httputil.HTTPServerRequest,
            FakeRequestObject({}, self.request.cookies),
        )
        handler.sid = self.sid
        handler.user = self.user
        handler.return_name = "sync_result"
        try:
            startclock = timestamp()
            handler.prepare_standalone()

            if not cache.get_station(self.sid, "backend_ok"):
                raise APIException("station_offline")

            self.refresh_user()
            routes.info.attach_info_to_request(handler, live_voting=True)
            handler.append("user", self.user.to_private_dict())
            handler.append(
                "api_info",
                {"exectime": timestamp() - startclock, "time": round(timestamp(), 0)},
            )
        except Exception as e:
            if handler:
                handler.write_error(500, exc_info=sys.exc_info(), no_finish=True)
            log.exception("websocket", "Exception during update.", e)
        finally:
            if handler:
                self.write_message(handler._output)

    def update_user(self):
        self.write_message({"user": self.user.to_private_dict()})

    def _do_auth(self, message):
        try:
            if not "user_id" in message or not message["user_id"]:
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument", argument="user_id"
                            ),
                        }
                    }
                )
            if not isinstance(message["user_id"], numbers.Number):
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "invalid_argument",
                            "text": self.rainwave_locale.translate(
                                "invalid_argument", argument="user_id"
                            ),
                        }
                    }
                )
            if not "key" in message or not message["key"]:
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.rainwave_locale.translate(
                                "missing_argument", argument="key"
                            ),
                        }
                    }
                )

            self.user = make_user(message["user_id"])
            self.user.ip_address = self.request.remote_ip
            self.user.authorize(None, message["key"])
            if not self.user.authorized:
                self.write_message(
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

            self.votes_by_key = (
                self.request.remote_ip if self.user.is_anonymous() else self.user.id
            )

            self.refresh_user()
            # no need to send the user's data to the user as that would have come with bootstrap
            # and will come with each synchronization of the schedule anyway
            self.write_message({"wsok": True})
            # since this will be the first action in any websocket interaction though,
            # it'd be a good time to send a station offline message.
            self._station_offline_check()
        except Exception as e:
            log.exception("websocket", "Exception during authentication.", e)
            self.close()

    def _station_offline_check(self):
        if not cache.get_station(self.sid, "backend_ok"):
            # shamelessly fake an error.
            self.write_message(
                {
                    "sync_result": {
                        "tl_key": "station_offline",
                        "text": self.rainwave_locale.translate("station_offline"),
                    }
                }
            )

    def _do_sched_check(self, message):
        if not "sched_id" in message or not message["sched_id"]:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.rainwave_locale.translate(
                            "missing_argument", argument="sched_id"
                        ),
                    }
                }
            )
            return
        if not isinstance(message["sched_id"], numbers.Number):
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "invalid_argument",
                        "text": self.rainwave_locale.translate(
                            "invalid_argument", argument="sched_id"
                        ),
                    }
                }
            )

        self._station_offline_check()

        sched_current_dict = cache.get_station(self.sid, "sched_current_dict")
        if sched_current_dict and (sched_current_dict["id"] != message["sched_id"]):
            self.update()
            self.write_message({"outdated_data_warning": {"outdated": True}})
