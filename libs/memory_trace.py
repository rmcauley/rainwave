# Necessary includes
import time
import sys
import tornado.ioloop

# Memory clearing includes
import gc
import linecache

# Meliae memory profiling (serious business, Linux only)
import os
import tempfile
try:
	import meliae.scanner
except:
	pass

# Other includes
from libs import config

sqlite = None
_prefix = ""

def setup(unique_prefix):
	global _prefix
	_prefix = unique_prefix

	if not config.get("memory_trace") or not "meliae" in sys.modules:
		return

	record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 60 * 60 * 1000)
	record_loop.start()

def record_sizes():
	global _prefix
	
	gc.collect()
	linecache.clearcache()

	try:
		d = os.path.join(tempfile.gettempdir(), "rw_memory_%s_%s.json" % (_prefix, int(time.time())))
		meliae.scanner.dump_all_objects(d)
	except:
		pass