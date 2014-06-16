# Necessary includes
import time
import sys
import sqlite3
import tornado.ioloop

# Memory clearing includes
import gc
import linecache

# Meliae memory profiling (serious business, Linux only)
import os
import sys
import tempfile
try:
	import meliae.scanner
except:
	pass

# Other includes
from libs import config

sqlite = None

def setup(db_file):
	if not config.get("memory_trace") or not "meliae" in sys.modules:
		return

	record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 60 * 60 * 1000)
	record_loop.start()

def record_sizes():
	gc.collect()
	linecache.clearcache()

	d = os.path.join(tempfile.gettempdir(), "rw_memory_%s.json" % int(time.time()))
	meliae.scanner.dump_all_objects(d)