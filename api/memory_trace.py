import objgraph
import tornado.ioloop
import sys
import StringIO

from libs import log

def do_memory_dump():
	real_stdout = sys.stdout
	temp_stdout = StringIO.StringIO()
	sys.stdout = temp_stdout
	objgraph.show_most_common_types()
	sys.stdout.write("--------\n")
	objgraph.show_growth()
	log.debug("memtrace", "\n" + sys.stdout.getvalue())
	sys.stdout = real_stdout
	temp_stdout.close()

memtrace = tornado.ioloop.PeriodicCallback(do_memory_dump, 5000)
memtrace.start()
