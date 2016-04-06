# This module acts as a forwarder/proxy for ZMQ publishers and subscribers.

import zmq
from zmq.eventloop import ioloop, zmqstream
from libs import config

context = zmq.Context()
xpub = None
xpub_stream = None
xsub = None
xsub_stream = None

# ioloop.install() has to happen before anything happens with Tornado.
# Make sure to include this module as early as possible in your app!
def install_ioloop():
	ioloop.install()

def init_pub():
	global xpub
	global xpub_stream
	xpub = context.socket(zmq.XPUB)
	xpub.bind(config.get("zeromq_pub_socket"))
	xpub_stream = zmqstream.ZMQStream(xpub, ioloop)

def init_sub():
	global xsub
	global xsub_stream
	xsub = context.socket(zmq.XSUB)
	xsub.bind(config.get("zeromq_sub_socket"))
	xsub_stream = zmqstream.ZMQStream(xsub, ioloop)

def init_proxy():
	init_pub()
	init_sub()
	set_sub_callback(send_to_pub)
	set_pub_callback(send_to_sub)

def set_pub_callback(methd):
	xpub_stream.on_recv(methd)

def set_sub_callback(methd):
	xsub_stream.on_recv(methd)

def send_to_pub(message):
	xpub.send_multipart(message)

def send_to_sub(message):
	xsub.send_multipart(message)
