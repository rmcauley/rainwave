import orjson
import zmq
import zmq.devices
from zmq.eventloop.zmqstream import ZMQStream
from typing import Any, Callable
from src.backend import config
from web_api.web import APIException

_pub = None
_sub_stream = None


def init_pub() -> None:
    global _pub
    context = zmq.Context()
    _pub = context.socket(zmq.PUB)
    _pub.connect(config.zeromq_pub)


def init_sub() -> None:
    global _sub_stream
    context = zmq.Context()
    sub = context.socket(zmq.SUB)
    sub.connect(config.zeromq_sub)
    sub.setsockopt(zmq.SUBSCRIBE, b"")
    _sub_stream = ZMQStream(sub)


def set_sub_callback(methd: Callable[..., Any]) -> None:
    if not _sub_stream:
        raise APIException("internal_error", http_code=500)
    _sub_stream.on_recv(methd)


def publish(dct: dict[str, Any]) -> None:
    if not _pub:
        raise APIException("internal_error", http_code=500)
    _pub.send_string(  # pyright: ignore[reportUnknownMemberType]
        orjson.dumps(dct).decode("utf-8")
    )


def init_proxy() -> None:
    td = zmq.devices.ThreadDevice(zmq.FORWARDER, zmq.SUB, zmq.PUB)

    td.bind_in(config.zeromq_pub)
    td.setsockopt_in(zmq.IDENTITY, b"SUB")
    td.setsockopt_in(zmq.SUBSCRIBE, b"")

    td.bind_out(config.zeromq_sub)
    td.setsockopt_out(zmq.IDENTITY, b"PUB")

    td.start()
