import objgraph
import tempfile
import os
import time
import sys
from cStringIO import StringIO

# This is totally frowned upon but also totally necessary to do what we need to do
# in order to get this done.
import api.*
import api_requests.*
import api_requests.admin.*
import api_requests.admin_web.*
import api_requests.backend.*
import libs.*
import rainwave.*

initialized = False

def do():
	global initialized
	if not initialized:
		print "Hello"
		objgraph.show_growth(shortnames=False)
		# initialized = True
		return

	d = os.path.join(tempfile.gettempdir(), "rw_memory_trace", str(int(time.time())))
	try:
		os.makedirs(d)
	except Exception as e:
		log.warning("mem_trace", repr(e))

	types = []
	sys.stdout = StringIO()
	objgraph.show_growth(limit=1, shortnames=False)
	for line in sys.stdout.getvalue().split("\n"):
		types.append(line.split("\n")[0].split(" ", 1)[0])
	sys.stdout.close()
	sys.stdout = sys.__stdout__
	
	for t in types:
		d2 = os.path.join(d, t)
		os.mkdir(d2)
		i = 0
		for o in objgraph.by_type(t):
			f = os.path.join(d2, str(i) + ".png")
			objgraph.show_chain(objgraph.find_backref_chain(o, objgraph.is_proper_module), filename=f)
			i += 1