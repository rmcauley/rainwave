#!/usr/bin/python

import os
import sys
import tempfile
import argparse

import libs.config
import libs.db
import libs.cache
import libs.log
import rainwave.playlist
import rainwave.event
import rainwave.request

parser = argparse.ArgumentParser(description="Rainwave unit and API testing.")
parser.add_argument("--config", default=None)
args = parser.parse_args()
libs.config.load(args.config)

libs.db.open()
libs.db.create_tables()

sys.exit(0)
