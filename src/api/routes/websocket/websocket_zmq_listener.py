import orjson
import typing
from time import time as timestamp

from api.routes.websocket.live_voting import (
    delay_live_vote,
    delay_live_vote_removal,
)
from common import log
from common.zeromq import zeromq


def websocket_on_zmq(messages: list[typing.Any]) -> None:
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


def setup_websocket_zmq():
    zeromq.set_sub_callback(websocket_on_zmq)
