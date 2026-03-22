import orjson
import typing

from api.websocket.live_voting.live_voting import (
    live_voting_broadcast_service,
)
from api.websocket.websocket_tracker.websocket_tracker import websockets_by_sid
from common import log
from common.zeromq import zeromq


async def websocket_on_zmq(messages: list[typing.Any]) -> None:
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
            elif message["action"] == "live_voting_updated":
                await live_voting_broadcast_service.handle_live_voting_updated_message(
                    message
                )
            elif message["action"] == "update_all":
                live_voting_broadcast_service.clear_pending_live_vote(message["sid"])
                await websockets_by_sid[message["sid"]].update_all(message["sid"])
            elif message["action"] == "update_listen_key":
                for sid in websockets_by_sid:
                    websockets_by_sid[sid].update_anonymous_user_by_listen_key(
                        message["listen_key"]
                    )
            elif message["action"] == "update_user":
                for sid in websockets_by_sid:
                    websockets_by_sid[sid].update_registered_user(message["user_id"])
            elif message["action"] == "ping":
                log.debug("zeromq", "Pong")
        except Exception as e:
            log.exception(
                "zeromq", "Error handling Zero MQ action '%s'" % message["action"], e
            )
            return


def setup_websocket_zmq():
    zeromq.set_sub_callback(websocket_on_zmq)
