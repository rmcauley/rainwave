#!/usr/bin/python

import argparse
import sys
import psycopg2

import libs.config
import libs.db

parser = argparse.ArgumentParser(description="Rainwave DB table creator.")
parser.add_argument("--config", default=None)
args = parser.parse_args()
libs.config.load(args.config)

libs.db.connect()

libs.db.create_tables()
libs.db.add_custom_fields()

sys.exit(0)
