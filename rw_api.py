#!/usr/bin/env python

# this include has to go first so ZMQ can steal IOLoop installation from Tornado
import libs.zeromq

import argparse
import sys

import api.server
import libs.config

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rainwave API server.")
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    libs.config.load(args.config)

    # Loading all the API requests needs to come after loading the config,
    # as some handlers set their URLs dependent on configuration values.

    # pylint: disable=W0614,W0401
    from api_requests import *
    from api_requests.admin import *
    from api_requests.admin_web import *
    from api_requests.auth import *
    # pylint: enable=W0614,W0401

    server = api.server.APIServer()
    sys.exit(server.start())
