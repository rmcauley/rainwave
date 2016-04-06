"""
An XPUB/XSUB broker that forwards subscriptions
https://gist.github.com/minrk/4667957

"""
import zmq
from threading import Thread
from libs import config

context = None
threads = None
xpub_url = None
xsub_url = None

def start():
	global xpub_url
	global xsub_url
	global context
	global threads

	xpub_url = config.get("zeromq_pub_socket")
	xsub_url = config.get("zeromq_sub_socket")
	context = zmq.Context()
	threads = [ Thread(target=f, args=(context,)) for f in (broker,) ]
	[ t.start() for t in threads ]		#pylint: disable=W0106

def end():
	global context
	global threads

	context.term()
	[ t.join() for t in threads ]		#pylint: disable=W0106

def broker(ctx):
	xpub = ctx.socket(zmq.XPUB)
	xpub.bind(xpub_url)
	xsub = ctx.socket(zmq.XSUB)
	xsub.bind(xsub_url)

	poller = zmq.Poller()
	poller.register(xpub, zmq.POLLIN)
	poller.register(xsub, zmq.POLLIN)
	while True:
		events = dict(poller.poll(1000))
		if xpub in events:
			message = xpub.recv_multipart()
			xsub.send_multipart(message)
		if xsub in events:
			message = xsub.recv_multipart()
			xpub.send_multipart(message)
