"""
An XPUB/XSUB broker that forwards subscriptions
https://gist.github.com/minrk/4667957

"""
import time
import zmq
from random import randint
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
	threads = [ Thread(target=f, args=(context,)) for f in (broker, publisher, subscriber) ]
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


def publisher(ctx):
	pub = ctx.socket(zmq.PUB)
	pub.connect(xsub_url)
	for n in range(1000):
		for topic in "ABC":
			msg = [topic, str(n)]
			pub.send_multipart(msg)
		time.sleep(0.25)


def subscriber(ctx):
	sub = ctx.socket(zmq.SUB)
	sub.connect(xpub_url)
	topics = 'ABC'
	subscription = set()
	while True:
		r = randint(0,len(topics))
		if r < len(topics):
			topic = topics[r]
			if topic not in subscription:
				subscription.add(topic)
				sub.setsockopt(zmq.SUBSCRIBE, topic)
		r2 = randint(0,len(topics))
		if r2 != r and r2 < len(topics):
			topic = topics[r2]
			if topic in subscription:
				subscription.remove(topic)
				sub.setsockopt(zmq.UNSUBSCRIBE, topic)
		time.sleep(0.3)
		print "subscribed to: %r" % sorted(subscription)
		while True:
			if sub.poll(timeout=0):
				print "received", sub.recv_multipart()
			else:
				break
