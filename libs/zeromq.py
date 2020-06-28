import zmq
import zmq.devices
from zmq.eventloop import ioloop, zmqstream
from libs import config

try:
    import ujson as json
except ImportError:
    import json

_pub = None
_sub_stream = None

ioloop.install()


def init_pub():
    global _pub
    context = zmq.Context()
    _pub = context.socket(zmq.PUB)
    _pub.connect(bytes(config.get("zeromq_pub"), "utf-8"))


def init_sub():
    global _sub_stream
    context = zmq.Context()
    sub = context.socket(zmq.SUB)
    sub.connect(bytes(config.get("zeromq_sub"), "utf-8"))
    sub.setsockopt(zmq.SUBSCRIBE, b"")
    _sub_stream = zmqstream.ZMQStream(sub)


def set_sub_callback(methd):
    _sub_stream.on_recv(methd)


def publish(dct):
    _pub.send_string(json.dumps(dct))


def init_proxy():
    td = zmq.devices.ThreadDevice(zmq.FORWARDER, zmq.SUB, zmq.PUB)

    td.bind_in(bytes(config.get("zeromq_pub"), "utf-8"))
    td.setsockopt_in(zmq.IDENTITY, b"SUB")
    td.setsockopt_in(zmq.SUBSCRIBE, b"")

    td.bind_out(bytes(config.get("zeromq_sub"), "utf-8"))
    td.setsockopt_out(zmq.IDENTITY, b"PUB")

    td.start()
