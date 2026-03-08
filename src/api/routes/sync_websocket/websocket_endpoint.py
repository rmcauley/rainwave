import datetime
import orjson as json
import numbers
import sys
import uuid
import types
from time import time as timestamp
from urllib.parse import urlparse

from api import fieldtypes
from api.exceptions import APIException
from api.helpers.get_browser_locale import get_browser_locale
from api.handle_url import api_endpoints, handle_api_url
from api.handler_classes.api_handler import APIHandler
from api.routes.sync_websocket.fake_request_object import FakeRequestObject
from api.routes.sync_websocket.sync import (
    last_vote_by,
    websocket_allow_from,
    sessions,
    vote_once_every_seconds,
    votes_by,
)
from api.routes.sync_websocket.websocket_message import WSMessage
from common import config
from common import log
from common import playlist
from common import schedule
from common.zeromq import zeromq
from common.user.user_model import make_user
from libs import cache
import routes
import tornado

rainwave = types.SimpleNamespace(playlist=playlist, schedule=schedule)


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
class WSHandler(tornado.websocket.WebSocketHandler):
    is_websocket = True
    local_only = False
    help_hidden = False
    locale: common.locale.locale.RainwaveLocale

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.authorized = False
        self.msg_times = []
        self.throttled = False
        self.throttled_msgs = []
        self.votes_by_key = ""
        self.user = make_user(1)
        self.sid = config.default_station
        self.uuid = str(uuid.uuid4())

    def check_origin(self, origin):
        if websocket_allow_from == "*":
            return True
        parsed_origin = urlparse(origin)
        return parsed_origin.netloc.endswith(websocket_allow_from)

    def open(self, *args, **kwargs):
        super().open(*args, **kwargs)

        try:
            self.sid = int(args[0])
        except Exception:
            pass

        if not self.sid:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "missing_station_id",
                        "text": self.locale.translate("missing_station_id"),
                    }
                }
            )
            return
        if not self.sid in config.station_ids:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "invalid_station_id",
                        "text": self.locale.translate("invalid_station_id"),
                    }
                }
            )
            return

        self.locale = get_browser_locale(self)

        self.authorized = False

        self.msg_times = []
        self.throttled = False
        self.throttled_msgs = []

    def rw_finish(self, *args, **kwargs):
        self.close()

    def keep_alive(self):
        self.write_message({"ping": {"timestamp": timestamp()}})

    def on_close(self):
        global sessions
        self.throttled_msgs = []
        if self.sid:
            sessions[self.sid].remove(self)
        super().on_close()

    def write_message(self, obj, *args, **kwargs):
        message = json.dumps(obj)
        try:
            super().write_message(message, *args, **kwargs)
        except tornado.websocket.WebSocketClosedError:
            self.on_close()
        except tornado.websocket.WebSocketError as e:
            log.exception("websocket", "WebSocket Error", e)
            try:
                self.close()
            except Exception:
                self.on_close()

    def refresh_user(self):
        self.user.refresh(self.sid)

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
                                "text": self.locale.translate("websocket_throttle"),
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

    def should_vote_throttle(self):
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

    def on_message(self, message_text):
        try:
            message = WSMessage()
            message.update(json.loads(message_text))
        except:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "invalid_json",
                        "text": self.locale.translate("invalid_json"),
                    }
                }
            )
            return

        if not message.get("action"):
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.locale.translate(
                            "missing_argument", argument="action"
                        ),
                    }
                }
            )
            return

        if not self.authorized and message["action"] != "auth":
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "auth_required",
                        "text": self.locale.translate("auth_required"),
                    }
                }
            )
            return

        if not self.authorized and message["action"] == "auth":
            self._do_auth(message)
            return

        if message["action"] == "vote":
            if not message["entry_id"]:
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.locale.translate(
                                "missing_argument", argument="entry_id"
                            ),
                        }
                    }
                )
            elif not fieldtypes.integer(message["entry_id"]):
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "invalid_argument",
                            "text": self.locale.translate(
                                "missing_argument",
                                argument="entry_id",
                                reason=fieldtypes.integer_error,
                            ),
                        }
                    }
                )
            message["elec_id"] = rainwave.schedule.get_elec_id_for_entry(
                self.sid, message["entry_id"]
            )

        self._process_message(message)

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
                        "text": self.locale.translate("websocket_404"),
                    }
                }
            )
            return

        endpoint = api_endpoints[message["action"]](websocket=True)
        endpoint.locale = self.locale
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
        handler.locale = self.locale
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

    def login_mixup_warn(self):
        self.write_message(
            {
                "sync_result": {
                    "tl_key": "redownload_m3u",
                    "text": self.locale.translate("redownload_m3u"),
                }
            }
        )

    def _do_auth(self, message):
        try:
            if not "user_id" in message or not message["user_id"]:
                self.write_message(
                    {
                        "wserror": {
                            "tl_key": "missing_argument",
                            "text": self.locale.translate(
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
                            "text": self.locale.translate(
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
                            "text": self.locale.translate(
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
                            "text": self.locale.translate("auth_failed"),
                        }
                    }
                )
                self.close()
                return
            self.authorized = True
            self.uuid = str(uuid.uuid4())

            global sessions
            sessions[self.sid].append(self)

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
                        "text": self.locale.translate("station_offline"),
                    }
                }
            )

    def _do_sched_check(self, message):
        if not "sched_id" in message or not message["sched_id"]:
            self.write_message(
                {
                    "wserror": {
                        "tl_key": "missing_argument",
                        "text": self.locale.translate(
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
                        "text": self.locale.translate(
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
