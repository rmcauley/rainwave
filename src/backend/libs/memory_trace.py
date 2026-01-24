# Necessary includes
from time import time as timestamp
import sys

# Memory clearing includes
import gc
import linecache

# Meliae memory profiling (serious business, Linux only)
import os
import tempfile

import tornado.ioloop

try:
    import meliae.scanner
except:
    pass

# Other includes
from src.backend.config import config

_prefix = ""


def setup(unique_prefix: str) -> None:
    global _prefix
    _prefix = unique_prefix

    if not config.memory_trace or "meliae" not in sys.modules:
        return

    record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 60 * 60 * 1000)
    record_loop.start()


def record_sizes() -> None:
    global _prefix

    gc.collect()
    linecache.clearcache()

    try:
        d = os.path.join(
            tempfile.gettempdir(), "rw_memory_%s_%s.json" % (_prefix, int(timestamp()))
        )
        meliae.scanner.dump_all_objects(d)
    except:
        pass
