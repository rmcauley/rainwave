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

def local_exists(sid, key):
	return "sid%s_%s" % (sid, key) in local
	
def get_station(sid, key):
	return _memcache.get("sid%s_%s" % (sid, key))
	
def set(key, value):
	_memcache.set(key, value)

def get(key):
	return _memcache.get(key)

def refresh_local(key):
	local[key] = get(key)
	
def refresh_local_station(sid, key):
	local["sid%s_%s" % (sid, key)] = get_station(sid, key)
	
def push_local_to_memcache(key):
	set(key, local[key])

def push_local_station(sid, key):
	key = "sid%s_%s" % (sid, key)
	set(key, local[key])

def prime_rating_cache_for_events(events):
	key = 'song_ratings_%s' % event[0].sid
	local[key] = {}
	for event in events:
		for song in event.songs:
			local[key][song.id] = song.get_all_ratings()
	push_local_to_memcache(key)
	
def update_local_cache_for_sid(sid):
	refresh_local_station(sid, "album_diff")
	refresh_local_station(sid, "sched_next")
	refresh_local_station(sid, "sched_history")
	refresh_local_station(sid, "sched_current")
	refresh_local_station(sid, "listeners_current")
	refresh_local_station(sid, "listeners_internal")
	refresh_local_station(sid, "request_line")
	refresh_local_station(sid, "request_user_positions")
	refresh_local_station(sid, "user_rating_acl")
	refresh_local_station(sid, "user_rating_acl_song_index")
	refresh_local("request_expire_times")
	refresh_local("calendar")
	
	# The caches below should only be used on new-song refreshes
	refresh_local_station(sid, "song_ratings")
	
def update_user_rating_acl(sid, song_id):
	users = {}
	if local_exists(sid, "user_rating_acl"):
		users = get_local_station(sid, "user_rating_acl")
	songs = []
	if local_exists(sid, "user_rating_acl_song_index"):
		songs = get_local_station(sid, "user_rating_acl_song_index")

	while len(songs) > 2:
		del users[songs.pop(0)]
	songs.append(song_id)
	users[song_id] = {}
	
	for user_id in db.c.fetch_list("SELECT user_id FROM r4_listeners WHERE sid = %s AND user_id > 1", (sid,)):
		users[user_id] = True
		
	set_station_local(sid, "user_rating_acl", users)
	push_local_station(sid, "user_rating_acl")
	set_station_local(sid, "user_rating_acl_song_index", songs)
	push_local_station(sid, "user_rating_acl_song_index")
