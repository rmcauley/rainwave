import pylibmc
from libs import config
from libs import db

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
	
def set(key, value, save_local = False):
	if save_local or key in local:
		local[key] = value
	_memcache.set(key, value)
	
def get(key):
	if key in local:
		return local[key]
	return _memcache.get(key)

def set_user(user, key, value):
	if user.__class__.__name__ == 'int':
		set("u%s_%s" % (user, key), value)
	else:
		set("u%s_%s" % (user.id, key), value)
	
def get_user(user, key):
	if user.__class__.__name__ == 'int':
		return get("u%s_%s" % (user, key))
	else:
		return get("u%s_%s" % (user.id, key))
	
def set_station(sid, key, value, save_local = False):
	set("sid%s_%s" % (sid, key), value, save_local)
	
def get_station(sid, key):
	return get("sid%s_%s" % (sid, key))

def prime_rating_cache_for_events(events, songs = []):
	ratings = {}
	for e in events:
		for song in e.songs:
			ratings[song.id] = song.get_all_ratings()
	for song in songs:
		ratings[song.id] = song.get_all_ratings()
	set('song_ratings_%s' % events[0].sid, ratings)
	
def refresh_local(key):
	local[key] = _memcache.get(key)
	
def refresh_local_station(sid, key):
	# we can't use the normal get functions here since they'll ping what's already in local
	local["sid%s_%s" % (sid, key)] = _memcache.get("sid%s_%s" % (sid, key))
	
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
	
def reset_station_caches():
	for sid in config.station_ids:
		set_station(sid, "album_diff", None, True)
		set_station(sid, "sched_next", None, True)
		set_station(sid, "sched_history", None, True)
		set_station(sid, "sched_current", None, True)
		set_station(sid, "listeners_current", None, True)
		set_station(sid, "listeners_internal", None, True)
		set_station(sid, "request_line", None, True)
		set_station(sid, "request_user_positions", None, True)
		set_station(sid, "user_rating_acl", None, True)
		set_station(sid, "user_rating_acl_song_index", None, True)
		set("request_expire_times", None, True)
		set("calendar", None, True)
	
def update_user_rating_acl(sid, song_id):
	users = get_station(sid, "user_rating_acl")
	if not users:
		users = {}
	songs = get_station(sid, "user_rating_acl_song_index")
	if not songs:
		songs = []

	while len(songs) > 2:
		del users[songs.pop(0)]
	songs.append(song_id)
	users[song_id] = {}
	
	for user_id in db.c.fetch_list("SELECT user_id FROM r4_listeners WHERE sid = %s AND user_id > 1", (sid,)):
		users[song_id][user_id] = True
		
	set_station(sid, "user_rating_acl", users, True)
	set_station(sid, "user_rating_acl_song_index", songs, True)
