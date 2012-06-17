import pylibmc
from libs import config

_memcache = None
local = {}

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
	if not config.test_mode or config.get("test_use_memcache"):
		_memcache = pylibmc.Client(config.get("memcache_servers"), binary = True)
		_memcache.behaviors = { "tcp_nodelay": True, "ketama": config.get("memcache_ketama") }
	else:
		_memcache = TestModeCache()

def set_user(user, key, value):
	_memcache.set("u%s_%s" % (user.id, key), value)
	
def get_user(user, key):
	return _memcache.get("u%s_%s" % (user.id, key))
	
def set_station(sid, key, value):
	_memcache.set("sid%s_%s" % (sid, key), value)
	
def get_local_station(sid, key):
	return local["sid%s_%s" % (sid, key)]
	
def get_station(sid, key):
	return _memcache.get("sid%s_%s" % (sid, key))
	
def set(key, value):
	_memcache.set(key, value)

def get(key):
	return _memcache.get(key)

def refresh_local(key):
	local[key] = get(key)
	
def refresh_local_station(sid, key):
	local[key] = get_station(sid, key)
	
def push_local_to_memcache(key):
	set(key, local[key])

def prime_rating_cache_for_events(events):
	key = 'song_ratings_%s' % event[0].sid
	local[key] = {}
	for event in events:
		for song in event.songs:
			local[key][song.id] = song.get_all_ratings()
	push_local_to_memcache(key)