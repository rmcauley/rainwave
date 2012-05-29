import pylibmc
from libs import config

_memcache = None

def open():
	global _memcache
	_memcache = pylibmc.Client(config.get("memcache_servers"), binary = True)
	_memcache.behaviors = { "tcp_nodelay": True, "ketama": config.get("memcache_ketama") }

def set_user_var(user, *args):
	value = args.pop()
	key = "u%s_" % user.id
	key2 = args.join("_")
	_memcache.set(key + key2, value)
	
def get_user_var(user, *args):
	_memcache.get("u%s_%s" % (user.id, args.join("_")))
	
def set_station_var(sid, *args):
	value = args.pop()
	key = "sid%s_" % sid
	key2 = args.join("_")
	_memcache.set(key + key2, value)
	
def get_station_var(sid, *args):
	_memcache.get("sid%s_%s" % (sid, args.join("_")))
	
def set(key, value):
	_memcache.set(key, value)

def get(key):
	_memcache.get(key)
