# This module acts as a forwarder/proxy for ZMQ publishers and subscribers.

import zmq
from zmq.eventloop import ioloop, zmqstream
from libs import config

try:
	import ujson as json
except ImportError:
	import json

_context = zmq.Context()
_pub = None
_sub_stream = None

# ioloop.install() has to happen before anything happens with Tornado.
# Make sure to include this module as early as possible in your app!
def install_ioloop():
	ioloop.install()

def init_pub():
	global _pub
	_pub = _context.socket(zmq.PUB)
	_pub.bind(config.get("zeromq_act_as_pub_socket"))
	# pub_stream = zmqstream.ZMQStream(_pub)

def init_sub():
	global _sub_stream
	sub = _context.socket(zmq.SUB)
	sub.bind(config.get("zeromq_act_as_sub_socket"))
	_sub_stream = zmqstream.ZMQStream(sub)

def set_sub_callback(methd):
	_sub_stream.on_recv(methd)

def publish(dct):
	_pub.send_multipart(json.dumps(dct))

# def init_proxy():
# 	# Subs to other pubs
# 	frontend = _context.socket(zmq.SUB)
# 	frontend.bind(config.get("zeromq_act_as_pub_socket"))
# 	frontend.setsockopt(zmq.SUBSCRIBE, "")
# 	frontend_stream = zmqstream.ZMQStream(frontend)

# 	# Pubs to the other subs
# 	backend = _context.socket(zmq.PUB)
# 	backend.bind(config.get("zeromq_act_as_sub_socket"))
# 	backend_stream = zmqstream.ZMQStream(backend)

# 	frontend_stream.on_recv(lambda msg: backend.send_multipart(msg))		#pylint: disable=W0108
# 	backend_stream.on_recv(lambda msg: frontend.send_multipart(msg))		#pylint: disable=W0108