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
    _pub.connect(config.get("zeromq_pub"))


def init_sub():
    global _sub_stream
    context = zmq.Context()
    sub = context.socket(zmq.SUB)
    sub.connect(config.get("zeromq_sub"))
    sub.setsockopt(zmq.SUBSCRIBE, "")
    _sub_stream = zmqstream.ZMQStream(sub)


def set_sub_callback(methd):
    _sub_stream.on_recv(methd)


def publish(dct):
    _pub.send(json.dumps(dct))


def init_proxy():
    td = zmq.devices.ThreadDevice(zmq.FORWARDER, zmq.SUB, zmq.PUB)

    td.bind_in(config.get("zeromq_pub"))
    td.setsockopt_in(zmq.IDENTITY, "SUB")
    td.setsockopt_in(zmq.SUBSCRIBE, "")

    td.bind_out(config.get("zeromq_sub"))
    td.setsockopt_out(zmq.IDENTITY, "PUB")

    td.start()
