# Necessary includes
import time
import sys
import sqlite3
import tornado.ioloop

# Memory clearing includes
import gc
import linecache

# Pympler memory inspection
from pympler.asizeof import asizeof

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
	if not config.get("memory_trace"):
		return

	global sqlite
	sqlite = sqlite3.connect(db_file)
	try:
		c = sqlite.cursor()
		c.execute("SELECT * FROM memory_trace")
	except sqlite3.OperationalError:
		c = sqlite.cursor()
		c.execute("CREATE TABLE memory_trace(time INTEGER, module TEXT, size INTEGER)")
		sqlite.commit()

	clean_caches_loop = tornado.ioloop.PeriodicCallback(record_sizes, 120 * 60 * 1000)
	clean_caches_loop.start()

	record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 60 * 60 * 1000)
	record_loop.start()

def record_sizes():
	global sqlite
	gc.collect()
	linecache.clearcache()
	c = sqlite.cursor()

	for module_name in sys.modules.keys():
		c.execute("INSERT INTO memory_trace(time, module, size) VALUES (?, ?, ?)", (time.time(), module_name, asizeof(sys.modules[module_name])))

	sqlite.commit()
	dump_profile()

def dump_profile():
	if not "meliae" in sys.modules:
		return

	d = os.path.join(tempfile.gettempdir(), "rw_memory_%s.json" % int(time.time()))
	meliae.scanner.dump_all_objects(d)