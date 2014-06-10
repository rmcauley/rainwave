import time
import sys
import sqlite3
import tornado.ioloop
import linecache
from pympler.asizeof import asizeof

from libs import config

sqlite = None

def clear_caches():
	linecache.clearcache()

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

	record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 15 * 60 * 1000)
	clear_cache_loop = tornado.ioloop.PeriodicCallback(record_sizes, 120 * 60 * 1000)
	# record_loop = tornado.ioloop.PeriodicCallback(record_sizes, 30 * 60 * 1000)
	record_loop.start()

def record_sizes():
	global sqlite
	c = sqlite.cursor()

	for module_name in sys.modules.keys():
		c.execute("INSERT INTO memory_trace(time, module, size) VALUES (?, ?, ?)", (time.time(), module_name, asizeof(sys.modules[module_name])))

	sqlite.commit()