import pylibmc
from libs import config

_memcache = None

class TestModeCache(object):
	def __init__(self):
		self.vars = {}
	
	def get(self, key):
		if not key in self.vars:
			return None
		else:
			return self.vars[key]
			
	def set(self, key, value):
		self.vars[key] = value

def open():
	global _memcache
	if not config.test_mode:
		_memcache = pylibmc.Client(config.get("memcache_servers"), binary = True)
		_memcache.behaviors = { "tcp_nodelay": True, "ketama": config.get("memcache_ketama") }
	else:
		_memcache = TestModeCache()

def set_user_var(user, *args):
	value = args.pop()
	key = "u%s_" % user.id
	key2 = '_'.join(map(str, args))
	_memcache.set(key + key2, value)
	
def get_user_var(user, *args):
	_memcache.get("u%s_%s" % (user.id, '_'.join(map(str, args))))
	
def set_station_var(sid, *args):
	value = args.pop()
	key = "sid%s_" % sid
	key2 = args.join("_")
	_memcache.set(key + key2, value)
	
def get_station_var(sid, *args):
	_memcache.get("sid%s_%s" % (sid, '_'.join(map(str, args))))
	
def set(key, value):
	_memcache.set(key, value)

def get(key):
	_memcache.get(key)
