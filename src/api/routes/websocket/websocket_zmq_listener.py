import orjson
import typing

from api.routes.websocket.websocket_tracker import (
    vote_throttle_service,
    websockets_by_sid,
)
from common import log
from common.zeromq import zeromq


def websocket_on_zmq(messages: list[typing.Any]) -> None:
    for message in messages:
        try:
            message = orjson.loads(message)
        except Exception as e:
            log.exception("zeromq", "Error decoding ZeroMQ message.", e)
            return

        if not "action" in message or not message["action"]:
            log.critical("zeromq", "No action received from ZeroMQ.")

        try:
            if message["action"] == "result_sync":
                websockets_by_sid[message["sid"]].send_to_user(
                    message["user_id"], message["uuid_exclusion"], message["data"]
                )
            elif message["action"] == "live_voting":
                vote_throttle_service.handle_live_voting_message(message)
            elif message["action"] == "delayed_live_voting":
                vote_throttle_service.handle_delayed_live_voting_message(message)
            elif message["action"] == "update_all":
                vote_throttle_service.clear_delayed_live_vote(message["sid"])
                rainwave.playlist.update_num_songs()
                rainwave.playlist.prepare_cooldown_algorithm(message["sid"])
                cache.update_local_cache_for_sid(message["sid"])
                websockets_by_sid[message["sid"]].update_all(message["sid"])
                vote_throttle_service.reset_vote_counters()
            elif message["action"] == "update_ip":
                for sid in websockets_by_sid:
                    websockets_by_sid[sid].update_ip_address(message["ip"])
            elif message["action"] == "update_listen_key":
                for sid in websockets_by_sid:
                    websockets_by_sid[sid].update_listen_key(message["listen_key"])
            elif message["action"] == "update_user":
                for sid in websockets_by_sid:
                    websockets_by_sid[sid].update_user(message["user_id"])
            elif message["action"] == "ping":
                log.debug("zeromq", "Pong")
            elif message["action"] == "vote_by":
                vote_throttle_service.record_vote(message["by"])
        except Exception as e:
            log.exception(
                "zeromq", "Error handling Zero MQ action '%s'" % message["action"], e
            )
            return


def setup_websocket_zmq():
    zeromq.set_sub_callback(websocket_on_zmq)
