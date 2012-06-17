import tornado.web

from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_url

from libs import cache
from rainwave import playlist

sessions = {}

@handle_url("sync_update_all")
class SyncUpdateAll(tornado.web.RequestHandler):
	def prepare(self):
		if not self.request.remote_ip == "127.0.0.1":
			self.set_status(403)
			self.finish()
			
	def get(self):
		# These caches don't change between elections, and are safe to use at all times
		cache.refresh_local_station(self.sid, "album_diff")
		cache.refresh_local_station(self.sid, "sched_next")
		cache.refresh_local_station(self.sid, "sched_history")
		cache.refresh_local_station(self.sid, "sched_current")
		cache.refresh_local_station(self.sid, "listeners_current")
		cache.refresh_local("calendar")
		cache.refresh_local("news")
		
		# The caches below should only be used on new-song refreshes
		cache.refresh_local_station(self.sid, "song_ratings")
		cache.refresh_local_station(self.sid, "request_all")
		
		for session in sessions:
			session.update(True)
		
@handle_url("sync_update_user")
class SyncUpdateUser(tornado.web.RequestHandler):
	def prepare(self):
		if not self.request.remote_ip == "127.0.0.1":
			self.set_status(403)
			self.finish()
			
	def get(self):
		pass
			
@handle_url("sync_update_ip")
class SyncUpdateIP(tornado.web.RequestHandler):
	def prepare(self):
		if not self.request.remote_ip == "127.0.0.1":
			self.set_status(403)
			self.finish()
			
	def get(self):
		pass

@handle_url("sync")
class Sync(RequestHandler):
	auth_required = True
	
	@tornado.web.asynchronous
	def post(self):
		self.set_header("Content-Type", "application/json")
		if "init" in self.request.arguments:
			self.update()
		else:
			if not self.sid in sessions:
				sessions[sid] = []
			sessions[self.user.sid].append(self)
		
	def update(self, use_local_cache = False):
		# Front-load all non-animated content ahead of the schedule content
		# Since the schedule content is the most animated on R3, setting this content to load
		# first has a good impact on the perceived animation smoothness since table redrawing
		# doesn't have to take place during the first few frames.
		
		self.user.refresh()
		self.append("user", self.user.get_public_dict())
		
		if 'playlist' in self.request.arguments:
			self.append(constants.JSONName.all_albums, playlist.fetch_all_albums(self.user))
		elif 'artist_list' in self.request.arguments:
			self.append(constants.JSONName.artist_list, playlist.fetch_all_artists(self.sid))
		elif 'init' not in self.request.arguments:
			self.append(constants.JSONName.album_diff, cache.get_local_station(self.sid, 'album_diff'))
		
		if use_local_cache:
			self.append(globals.JSONName.requests_all, cache.get_local_station(self.sid, "request_all"))
		else:
			self.append(globals.JSONName.requests_all, cache.get_station(self.sid, "request_all"))
		self.append(globals.JSONName.requests_user, self.user.get_requests())
		self.append(globals.JSONName.calendar, cache.local["calendar"])
		if 'listeners_current' in self.request.arguments:
			self.append("listeners_current", cache.get_local_station(self.sid, "listeners_current"))
		
		self.append(globals.JSONName.current, self.user.make_event_jsonable(cache.get_local_station(self.sid, "sched_current"), use_local_cache))
		self.append(globals.JSONName.next, self.user.make_events_jsonable(cache.get_local_station(self.sid, "sched_next"), use_local_cache))
		self.append(globals.JSONName.history, self.user.make_event_jsonable(cache.get_local_station(self.sid, "sched_history"), use_local_cache))
		self.append("news", self.user.make_news_jsonable())		
		self.finish()
	
	def update_user(self):
		self.user.refresh()
		self.append("user", self.user.get_public_dict())
		self.finish()