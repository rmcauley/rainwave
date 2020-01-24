import argparse

import libs.cache

parser = argparse.ArgumentParser(description="Clear's Rainwave main memcache variables.")
parser.add_argument("--config", default=None)
args = parser.parse_args()
libs.config.load(args.config)
libs.cache.connect()
libs.cache.reset_station_caches()
