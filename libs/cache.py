__using_libmc = False
try:
	import pylibmc as libmc
	__using_libmc = True
except ImportError:
	import memcache as libmc

from libs import config
from libs import db

_memcache = None
_memcache_ratings = None
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

def connect():
	global _memcache
	global _memcache_ratings

	if _memcache:
		return
	if config.get("memcache_fake") or config.get("web_developer_mode"):
		_memcache = TestModeCache()
		_memcache_ratings = TestModeCache()
		reset_station_caches()
	else:
		if __using_libmc:
			_memcache = libmc.Client(config.get("memcache_servers"), binary = True)
			_memcache.behaviors = { "tcp_nodelay": True, "ketama": config.get("memcache_ketama") }
			_memcache_ratings = libmc.Client(config.get("memcache_ratings_servers"), binary = True)
			_memcache.behaviors = { "tcp_nodelay": True, "ketama": config.get("memcache_ratings_ketama") }
		else:
			_memcache = libmc.Client(config.get("memcache_servers"))
			_memcache_ratings = libmc.Client(config.get("memcache_ratings_servers"))
		if not _memcache_ratings:
			_memcache_ratings = _memcache

#pylint: disable=W0622
def set(key, value, save_local = False):
	if save_local or key in local:
		local[key] = value
	_memcache.set(key, value)
#pylint: disable=W0622

def get(key):
	if key in local:
		return local[key]
	return _memcache.get(key)

def set_user(user, key, value):
	if user.__class__.__name__ == 'int' or user.__class__.__name__ == 'long':
		set("u%s_%s" % (user, key), value)
	else:
		set("u%s_%s" % (user.id, key), value)

def get_user(user, key):
	if user.__class__.__name__ == 'int' or user.__class__.__name__ == 'long':
		return get("u%s_%s" % (user, key))
	else:
		return get("u%s_%s" % (user.id, key))

def set_station(sid, key, value, save_local = False):
	set("sid%s_%s" % (sid, key), value, save_local)

def get_station(sid, key):
	return get("sid%s_%s" % (sid, key))

def set_song_rating(song_id, user_id, rating):
	_memcache_ratings.set("rating_song_%s_%s" % (song_id, user_id), rating)

def get_song_rating(song_id, user_id):
	return _memcache_ratings.get("rating_song_%s_%s" % (song_id, user_id))

def set_album_rating(sid, album_id, user_id, rating):
	_memcache_ratings.set("rating_album_%s_%s_%s" % (sid, album_id, user_id), rating)

def set_album_faves(sid, album_id, user_id, fave):
	rating = get_album_rating(sid, album_id, user_id)
	if rating:
		rating['album_fave'] = fave
		set_album_rating(sid, album_id, user_id, rating)

def get_album_rating(sid, album_id, user_id):
	return _memcache_ratings.get("rating_album_%s_%s_%s" % (sid, album_id, user_id))

def prime_rating_cache_for_events(sid, events, songs = None):
	for e in events:
		for song in e.songs:
			prime_rating_cache_for_song(song, sid)
	if songs:
		for song in songs:
			prime_rating_cache_for_song(song, sid)

def prime_rating_cache_for_song(song, sid):
	for user_id, rating in song.get_all_ratings().iteritems():
		set_song_rating(song.id, user_id, rating)
	for album in song.albums:
		for user_id, rating in album.get_all_ratings(sid).iteritems():
			set_album_rating(sid, album.id, user_id, rating)

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
	refresh_local_station(sid, "sched_next_dict")
	refresh_local_station(sid, "sched_history_dict")
	refresh_local_station(sid, "sched_current_dict")
	refresh_local_station(sid, "current_listeners")
	refresh_local_station(sid, "request_line")
	refresh_local_station(sid, "request_user_positions")
	refresh_local_station(sid, "user_rating_acl")
	refresh_local_station(sid, "user_rating_acl_song_index")
	refresh_local("request_expire_times")

	all_stations = {}
	for station_id in config.station_ids:
		all_stations[station_id] = get_station(station_id, "all_station_info")
	set("all_stations_info", all_stations)

def reset_station_caches():
	set("request_expire_times", None, True)
	for sid in config.station_ids:
		set_station(sid, "album_diff", None, True)
		set_station(sid, "sched_next", None, True)
		set_station(sid, "sched_history", None, True)
		set_station(sid, "sched_current", None, True)
		set_station(sid, "current_listeners", None, True)
		set_station(sid, "request_line", None, True)
		set_station(sid, "request_user_positions", None, True)
		set_station(sid, "user_rating_acl", None, True)
		set_station(sid, "user_rating_acl_song_index", None, True)

def update_user_rating_acl(sid, song_id):
	users = get_station(sid, "user_rating_acl")
	if not users:
		users = {}
	songs = get_station(sid, "user_rating_acl_song_index")
	if not songs:
		songs = []

	while len(songs) > 5:
		to_remove = songs.pop(0)
		if to_remove in users:
			del users[to_remove]
	songs.append(song_id)
	users[song_id] = {}

	for user_id in db.c.fetch_list("SELECT user_id FROM r4_listeners WHERE sid = %s AND user_id > 1", (sid,)):
		users[song_id][user_id] = True

	set_station(sid, "user_rating_acl", users, True)
	set_station(sid, "user_rating_acl_song_index", songs, True)
