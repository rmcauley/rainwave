#!/usr/bin/python

import zmq
import argparse
import libs.config

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Rainwave ZeroMQ forwarding server.")
	parser.add_argument("--config", default=None)
	args = parser.parse_args()
	libs.config.load(args.config)

	try:
		context = zmq.Context(1)

		frontend = context.socket(zmq.SUB)
		frontend.bind(libs.config.get("zeromq_act_as_pub_socket"))
		frontend.setsockopt(zmq.SUBSCRIBE, "")

		backend = context.socket(zmq.PUB)
		backend.bind(libs.config.get("zeromq_act_as_sub_socket"))

		zmq.device(zmq.FORWARDER, frontend, backend)
	except Exception, e:
		print e
	finally:
		frontend.close()
		backend.close()
		context.term()