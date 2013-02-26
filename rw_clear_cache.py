#!/usr/bin/python

import os
import sys
import argparse

import libs.cache

parser = argparse.ArgumentParser(description="Rainwave backend daemon.")
parser.add_argument("--config", default=None)
args = parser.parse_args()
libs.config.load(args.config)		
libs.cache.open()
libs.cache.reset_station_caches()