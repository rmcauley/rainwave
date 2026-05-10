import orjson
import zmq
from zmq.eventloop.zmqstream import ZMQStream
from typing import Any, Callable
from api.exceptions import APIException
from common import config

_context: zmq.Context[zmq.Socket[bytes]] | None = None
_pub: zmq.Socket[bytes] | None = None
_sub: zmq.Socket[bytes] | None = None
_sub_stream: ZMQStream | None = None


def _get_context() -> zmq.Context[zmq.Socket[bytes]]:
    global _context
    if _context is None:
        _context = zmq.Context()
    return _context


def _get_pub() -> zmq.Socket[bytes]:
    global _pub
    if _pub is None:
        _pub = _get_context().socket(zmq.PUB)
        _pub.connect(config.zeromq_publish_url)
    return _pub


def _get_sub() -> zmq.Socket[bytes]:
    global _sub
    if _sub is None:
        _sub = _get_context().socket(zmq.SUB)
        _sub.connect(config.zeromq_subscribe_url)
        _sub.setsockopt(zmq.SUBSCRIBE, b"")
    return _sub


def connect_publisher() -> None:
    _get_pub()


def set_sub_callback(methd: Callable[..., Any]) -> None:
    global _sub_stream
    if _sub_stream is None:
        _sub_stream = ZMQStream(_get_sub())
    _sub_stream.on_recv(methd)


def publish(dct: dict[str, Any]) -> None:
    pub = _get_pub()
    if not pub:
        raise APIException("internal_error", status_code=500)
    pub.send_string(orjson.dumps(dct).decode("utf-8"))


def run_proxy() -> None:
    context = _get_context()
    publisher_frontend = context.socket(zmq.SUB)
    publisher_frontend.bind(config.zeromq_publish_url)
    publisher_frontend.setsockopt(zmq.SUBSCRIBE, b"")

    subscriber_backend = context.socket(zmq.PUB)
    subscriber_backend.bind(config.zeromq_subscribe_url)

    zmq.proxy(publisher_frontend, subscriber_backend)
