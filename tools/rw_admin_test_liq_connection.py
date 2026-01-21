#!/usr/bin/env python

import argparse

import libs.config

from api import liquidsoap

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tests LiquidSoap connectivity.")
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    libs.config.load(args.config)

    for sid in libs.config.station_ids:
        print(liquidsoap.test(sid))
