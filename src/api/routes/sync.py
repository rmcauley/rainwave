import typing
import datetime
import numbers
import sys
import uuid
import asyncio
from urllib.parse import urlparse
from time import time as timestamp

try:
    import ujson as json
except ImportError:
    import json

import tornado.web
import tornado.websocket
import tornado.ioloop
import tornado.locks
import tornado.httputil
import tornado.concurrent

from api import fieldtypes
from api.exceptions import APIException
from api.web import APIHandler
from api.web import get_browser_locale
from api.urls import api_endpoints
from api.urls import handle_api_url
from common.user.user_model import make_user
import common.locale.locale
import routes.info
import rainwave.playlist
import rainwave.schedule

from libs import cache
from libs import log
from common import config
from libs import zeromq


class SessionBank:
    def __init__(self):
        super().__init__()
        self.sessions = []
        self.websockets = []
        self.throttled = {}
        self.websockets_by_user = {}

    def __iter__(self):
        for item in self.sessions:
            yield item

    def append(self, session):
        if session.is_websocket:
            if not session in self.websockets:
                self.websockets.append(session)
            if not session.user.is_anonymous():
                if not session.user.id in self.websockets_by_user:
                    self.websockets_by_user[session.user.id] = []
                self.websockets_by_user[session.user.id].append(session)
        elif not session in self.sessions:
            self.sessions.append(session)

    def remove(self, session):
        if session in self.throttled:
            tornado.ioloop.IOLoop.instance().remove_timeout(self.throttled[session])
            del self.throttled[session]
        if session in self.websockets:
            self.websockets.remove(session)
            if (
                not session.user.is_anonymous()
                and session.user.id in self.websockets_by_user
                and session in self.websockets_by_user
            ):
                self.websockets_by_user[session.user.id].remove(session)
                if not self.websockets_by_user[session.user.id]:
                    del self.websockets_by_user[session.user.id]
        elif session in self.sessions:
            self.sessions.remove(session)

    def clear(self):
        for timer in self.throttled.values():
            tornado.ioloop.IOLoop.instance().remove_timeout(timer)
        self.sessions[:] = []
        self.throttled.clear()

    def find_user(self, user_id):
        toret = []
        for session in self.sessions + self.websockets:
            if session.user.id == user_id:
                toret.append(session)
        return toret

    def find_ip(self, ip_address):
        toret = []
        for session in self.sessions + self.websockets:
            if session.request.remote_ip == ip_address:
                toret.append(session)
        return toret

    def find_listen_key(self, listen_key):
        toret = []
        for session in self.sessions + self.websockets:
            if session.user.data.get("listen_key") == listen_key:
                toret.append(session)
        return toret

    def keep_alive(self):
        for session in self.sessions + self.websockets:
            try:
                session.keep_alive()
            except Exception as e:
                session.rw_finish()
                log.exception("sync", "Session failed keepalive.", e)

    def update_all(self, sid):
        session_count = 0
        session_failed_count = 0
        for session in self.sessions + self.websockets:
            try:
                session.update()
                session_count += 1
            except Exception as e:
                try:
                    session.rw_finish()
                except:
                    pass
                session_failed_count += 1
                log.exception("sync_update_all", "Failed to update session.", e)
        log.debug(
            "sync_update_all",
            "Updated %s sessions (%s failed) for sid %s."
            % (session_count, session_failed_count, sid),
        )

        self.clear()

    # this function is only called when the user's tune_in status changes
    # though it does send an update for the whole user() object if the situation
    # is correct
    def _do_user_update(self, session, updated_by_ip):
        # clear() might wipe out the timeouts for a bigger update (that includes user update anyway!)
        # don't bother updating again if that's already happened
        if not session in self.throttled:
            return
        del self.throttled[session]

        try:
            potential_mixup_warn = (
                updated_by_ip
                and not session.user.is_anonymous()
                and not session.user.is_tunedin()
            )
            session.refresh_user()
            if potential_mixup_warn and not session.user.is_tunedin():
                log.debug(
                    "sync_update_ip",
                    "Warning logged in user of potential M3U mixup at IP %s"
                    % session.request.remote_ip,
                )
                session.login_mixup_warn()
            else:
                session.update_user()
        except Exception as e:
            log.exception("sync", "Session failed to be updated during update_user.", e)
            try:
                session.rw_finish()
            except Exception:
                log.exception("sync", "Session failed finish() during update_user.", e)

    def send_to_user(self, user_id, uuid_exclusion, data):
        if not user_id in self.websockets_by_user:
            return
        if "message_id" in data:
            del data["message_id"]
        for session in self.websockets_by_user[user_id]:
            if not session.uuid == uuid_exclusion:
                session.write_message(data)

    def send_to_all(self, uuid_exclusion, data):
        for session in self.websockets:
            if not uuid_exclusion == session.uuid:
                session.write_message(data)

    def _throttle_session(self, session, updated_by_ip=False):
        if not session in self.throttled:
            self.throttled[session] = tornado.ioloop.IOLoop.instance().add_timeout(
                datetime.timedelta(seconds=2),
                lambda: self._do_user_update(session, updated_by_ip),
            )

    def update_user(self, user_id):
        # throttle rapid user updates - usually when a user does something like
        # switch relays on their media player this can happen.
        for session in self.find_user(user_id):
            self._throttle_session(session)

    def update_ip_address(self, ip_address):
        for session in self.find_ip(ip_address):
            self._throttle_session(session, True)

    def update_listen_key(self, listen_key):
        for session in self.find_listen_key(listen_key):
            self._throttle_session(session)


sessions = {}
delayed_live_vote = {}
delayed_live_vote_timers = {}
websocket_allow_from = "*"
votes_by = {}
last_vote_by = {}
vote_once_every_seconds = 5  # how many seconds have to pass before a user has their vote live broadcast if they're spamming


def init() -> None:
    global sessions
    global websocket_allow_from

    for sid in config.station_ids:
        sessions[sid] = SessionBank()
        delayed_live_vote[sid] = None
        delayed_live_vote_timers[sid] = None
    websocket_allow_from = config.websocket_allow_from
    tornado.ioloop.PeriodicCallback(_keep_all_alive, 30000).start()
    zeromq.set_sub_callback(_on_zmq)


def _keep_all_alive() -> None:
    global sessions
    for sid in sessions:
        sessions[sid].keep_alive()


def _on_zmq(messages: list[typing.Any]) -> None:
    global votes_by
    global last_vote_by

    for message in messages:
        try:
            message = json.loads(message)
        except Exception as e:
            log.exception("zeromq", "Error decoding ZeroMQ message.", e)
            return

        if not "action" in message or not message["action"]:
            log.critical("zeromq", "No action received from ZeroMQ.")

        try:
            if message["action"] == "result_sync":
                sessions[message["sid"]].send_to_user(
                    message["user_id"], message["uuid_exclusion"], message["data"]
                )
            elif message["action"] == "live_voting":
                sessions[message["sid"]].send_to_all(
                    message["uuid_exclusion"], message["data"]
                )
                delay_live_vote_removal(message["sid"])
            elif message["action"] == "delayed_live_voting":
                if not delayed_live_vote_timers[message["sid"]]:
                    delay_live_vote(message)
                delayed_live_vote[message["sid"]] = message
            elif message["action"] == "update_all":
                delay_live_vote_removal(message["sid"])
                rainwave.playlist.update_num_songs()
                rainwave.playlist.prepare_cooldown_algorithm(message["sid"])
                cache.update_local_cache_for_sid(message["sid"])
                sessions[message["sid"]].update_all(message["sid"])
                votes_by = {}
                last_vote_by = {}
            elif message["action"] == "update_ip":
                for sid in sessions:
                    sessions[sid].update_ip_address(message["ip"])
            elif message["action"] == "update_listen_key":
                for sid in sessions:
                    sessions[sid].update_listen_key(message["listen_key"])
            elif message["action"] == "update_user":
                for sid in sessions:
                    sessions[sid].update_user(message["user_id"])
            elif message["action"] == "ping":
                log.debug("zeromq", "Pong")
            elif message["action"] == "vote_by":
                votes_by[message["by"]] = (
                    votes_by[message["by"]] + 1 if message["by"] in votes_by else 1
                )
                last_vote_by[message["by"]] = timestamp()
        except Exception as e:
            log.exception(
                "zeromq", "Error handling Zero MQ action '%s'" % message["action"], e
            )
            return


def delay_live_vote_removal(sid: int) -> None:
    if delayed_live_vote_timers[sid]:
        tornado.ioloop.IOLoop.instance().remove_timeout(delayed_live_vote_timers[sid])
        delayed_live_vote[sid] = None
        delayed_live_vote_timers[sid] = None


def delay_live_vote(message: dict[str, typing.Any]) -> None:
    delayed_live_vote_timers[
        message["sid"]
    ] = tornado.ioloop.IOLoop.instance().add_timeout(
        datetime.timedelta(seconds=vote_once_every_seconds),
        lambda: process_delayed_live_vote(message["sid"]),
    )


def process_delayed_live_vote(sid: int) -> None:
    delayed_live_vote_timers[sid] = None
    if not delayed_live_vote[sid]:
        return
    sessions[sid].send_to_all(None, delayed_live_vote[sid]["data"])
    delayed_live_vote[sid] = None


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

    async def post(self):
        global sessions

        routes.info.check_sync_status(self.sid, self.get_argument_bool("offline_ack"))

        self.set_header("Content-Type", "application/json")

        if not self.get_argument("resync"):
            sched_current_dict = cache.get_station(self.sid, "sched_current_dict")
            if (
                self.get_argument("known_event_id")
                and sched_current_dict
                and (sched_current_dict["id"] != self.get_argument("known_event_id"))
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
        self.append("user", self.user.to_private_dict())
        self.finish()

    def login_mixup_warn(self):
        self.append(
            "redownload_m3u",
            {
                "tl_key": "redownload_m3u",
                "text": self.locale.translate("redownload_m3u"),
            },
        )
        self.finish()


class FakeRequestObject:
    def __init__(self, arguments, cookies):
        self.arguments = arguments
        self.cookies = cookies


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


class WSMessage(dict):
    def __lt__(self, other):
        if self["action"] == "request" and other["action"] != "request":
            return False
        return True

    def __gt__(self, other):
        if self["action"] == "request" and other["action"] != "request":
            return True
        return False

    def __eq__(self, other):
        if self["action"] == "request" and other["action"] == "request":
            return True
        return False

    def __le__(self, other):
        return self.__lt__(other) or self.__eq__(other)

    def __ge__(self, other):
        return self.__gt__(other) or self.__eq__(other)

    def __ne__(self, other):
        return not self.__eq__(other)


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
