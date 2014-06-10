import tornado.web
import tornado.ioloop
import datetime
import time

from api import fieldtypes
from api.exceptions import APIException
from api.web import APIHandler
from api.server import handle_api_url
from api import fieldtypes
import api_requests.info

from libs import cache
from libs import log
from libs import config
from rainwave import playlist

sessions = {}

def init():
	for sid in config.station_ids:
		sessions[sid] = []

@handle_api_url("sync_update_all")
class SyncUpdateAll(APIHandler):
	local_only = True
	auth_required = False
	sid_required = False
	hidden = True

	def post(self):
		self.append("sync_all_result", "Processing.")

	def on_finish(self):
		if not self.get_status() == 200:
			log.debug("sync_update_all", "sync_update_all request was not OK.")
			return
		log.debug("sync_update_all", "Updating all sessions for sid %s" % self.sid)
		cache.update_local_cache_for_sid(self.sid)

		session_count = 0
		if self.sid in sessions:
			for session in sessions[self.sid]:
				session_count += 1
				session.update()
		log.debug("sync_update_all", "Updated %s sessions for sid %s." % (session_count, self.sid))
		# You might think this is weird but this module has had memory leak issues
		# YES I UNDERSTAND HOW GARBAGE COLLECTIONS WORKS I am just being ultra paranoid and hoping
		# ~magic~ solves this.
		del sessions[self.sid]
		sessions[self.sid] = []
		super(SyncUpdateAll, self).on_finish()

@handle_api_url("sync_update_user")
class SyncUpdateUser(APIHandler):
	local_only = True
	auth_required = False
	sid_required = False
	hidden = True

	fields = { "sync_user_id": (fieldtypes.integer, True)}

	def post(self):
		self.append("sync_user_result", "Processing.")

	def on_finish(self):
		if not self.get_status() == 200:
			log.debug("sync_update_user", "sync_update_user request was not OK.")
			return

		user_id = long(self.get_argument("sync_user_id"))
		for sid in sessions:
			for session in sessions[sid]:
				if session.user.id == user_id:
					log.debug("sync_update_user", "Updating user %s session." % user_id)
					session.update_user()
					break

		super(SyncUpdateUser, self).on_finish()

@handle_api_url("sync_update_ip")
class SyncUpdateIP(APIHandler):
	local_only = True
	auth_required = False
	sid_required = False
	hidden = True

	fields = { "ip_address": (fieldtypes.ip_address, True) }

	def post(self):
		self.append("sync_ip_result", "Processing.")

	def on_finish(self):
		if not self.get_status() == 200:
			log.debug("sync_update_ip", "sync_update_ip request was not OK.")
			return

		ip_address = self.get_argument("ip_address")
		for sid in sessions:
			for session in sessions[sid]:
				if session.user.is_anonymous() and session.request.remote_ip == ip_address:
					log.debug("sync_update_ip", "Updating IP %s" % ip_address)
					session.update_user()
				elif session.request.remote_ip == ip_address:
					log.debug("sync_update_ip", "Warning logged in user of potential mixup at IP %s" % ip_address)
					if session.anon_registered_mixup_warn():
						session.update_user()

		super(SyncUpdateIP, self).on_finish()

@handle_api_url("sync")
class Sync(APIHandler):
	description = ("Presents the same information as the 'info' requests, but will wait until the next song change in order to deliver the information. "
					"Will send whitespace every 20 seconds in a bid to keep the connection alive.  Use offline_ack to have the connection long poll until "
					"the station is back online, and use resync to get all information immediately rather than waiting.  known_event_id can be added "
					"to the request - if the currently playing event ID (i.e. sched_current.id) is different than the one provided, information will be sent immediately. "
					"This allows for gaps inbetween requests to be handled elegantly.")
	auth_required = True
	fields = { "offline_ack": (fieldtypes.boolean, None), "resync": (fieldtypes.boolean, None), "known_event_id": (fieldtypes.positive_integer, None) }

	# def initialize(self, **kwargs):
	# 	super(Sync, self).initialize(**kwargs)
		# self.keep_alive_handle = None

	@tornado.web.asynchronous
	def post(self):
		if not cache.get_station(self.user.request_sid, "backend_ok") and not self.get_argument("offline_ack"):
			raise APIException("station_offline")

		# self.keep_alive_handle = None

		self.set_header("Content-Type", "application/json")
		
		if not self.get_argument("resync"):
			if self.get_argument("known_event_id") and (cache.get_station(self.sid, "sched_current_dict")['id'] != self.get_argument("known_event_id")):
				self.update()
			else:
				# self.keep_alive()
				self.add_to_sessions()
		else:
			self.update()

	def add_to_sessions(self):
		global sessions
		sessions[self.user.request_sid].append(self)

	def remove_from_sessions(self):
		global sessions
		try:
			sessions[self.user.request_sid].remove(self)
		except:
			# If removing the session fails (ValueError, etc) it'll get cleaned up on the total wipe-out in the sync_all handler
			pass

	def on_connection_close(self, *args, **kwargs):
		self.remove_from_sessions()
		super(Sync, self).on_connection_close(*args, **kwargs)

	def update(self):
		self.remove_from_sessions()

		# Don't proceed if this connection is already closed
		if self._finished:
			return

		# Overwrite this value since who knows how long we've spent idling
		self._startclock = time.time()

		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh()
		api_requests.info.attach_info_to_request(self)
		self.finish()

	# def finish(self):
	# 	# if self.keep_alive_handle:
	# 	# 	tornado.ioloop.IOLoop.instance().remove_timeout(self.keep_alive_handle)
	# 	super(Sync, self).finish()

	def update_user(self):
		self.remove_from_sessions()

		if self._finished:
			return

		self._startclock = time.time()

		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh()
		self.append("user", self.user.to_private_dict())
		self.finish()

	# def keep_alive(self):
	# 	if not self._finished:
	# 		self.write(" ")
	# 		self.keep_alive_handle = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=20), self.keep_alive)

	def anon_registered_mixup_warn(self):
		self.user.refresh()
		if not self.user.is_anonymous() and not self.user.is_tunedin():
			self.append_standard("redownload_m3u")
			return True
		return False

