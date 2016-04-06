# This module acts as a forwarder/proxy for ZMQ publishers and subscribers.

import zmq
from zmq.eventloop import ioloop, zmqstream
from libs import config

try:
	import ujson as json
except ImportError:
	import json

context = zmq.Context()
pub = None
pub_stream = None
sub = None
sub_stream = None

# ioloop.install() has to happen before anything happens with Tornado.
# Make sure to include this module as early as possible in your app!
def install_ioloop():
	ioloop.install()

def init_pub(socket=None):
	global pub
	global pub_stream
	pub = context.socket(zmq.PUB)
	pub.bind(socket or config.get("zeromq_pub_socket"))
	pub_stream = zmqstream.ZMQStream(pub)

def init_sub():
	global sub
	global sub_stream
	sub = context.socket(zmq.SUB)
	sub.bind(config.get("zeromq_sub_socket"))
	sub_stream = zmqstream.ZMQStream(sub)

def set_sub_callback(methd):
	sub_stream.on_recv(methd)

def publish(dct):
	pub.send_multipart(json.dumps(dct))

def init_proxy():
	init_pub(config.get("zeromq_proxy_socket"))
	init_sub()
	pub_stream.on_recv(lambda msg: sub.send_multipart(msg))		#pylint: disable=W0108
	sub_stream.on_recv(lambda msg: pub.send_multipart(msg))		#pylint: disable=W0108
