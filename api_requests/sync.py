import tornado.web
import tornado.ioloop
import datetime
import time

from api import fieldtypes
from api.exceptions import APIException
from api.web import APIHandler
from api.server import handle_api_url
import api_requests.info

from libs import cache
from libs import log
from libs import config

class SessionBank(object):
	def __init__(self):
		super(SessionBank, self).__init__()
		self.sessions = []
		self.to_remove = []
		self.user_update_timers = {}
		self.ip_update_timers = {}

	def __iter__(self):
		for item in self.sessions:
			yield item

	def append(self, session):
		self.sessions.append(session)

	def remove(self, session):
		self.to_remove.append(session)

	def clean(self):
		for session in self.to_remove:
			if self.sessions.count(session) > 0:
				self.sessions.remove(session)
		self.to_remove[:] = []

	def clear(self):
		self.sessions[:] = []
		self.to_remove[:] = []
		for user_id, timer in self.user_update_timers.iteritems():
			tornado.ioloop.IOLoop.instance().remove_timeout(timer)
		self.user_update_timers = {}
		for ip_address, timer in self.ip_update_timers.iteritems():
			tornado.ioloop.IOLoop.instance().remove_timeout(timer)
		self.ip_update_timers = {}

	def find_user(self, user_id):
		toret = []
		for session in self.sessions:
			if session.user.id == user_id:
				toret.append(session)
		return toret

	def find_ip(self, ip_address):
		toret = []
		for session in self.sessions:
			if session.request.remote_ip == ip_address:
				toret.append(session)
		return toret

	def keep_alive(self):
		for session in self.sessions:
			try:
				session.keep_alive()
			except Exception as e:
				self.remove(session)
				log.exception("sync", "Session failed keepalive.", e)

	def update_all(self, sid):
		self.clean()

		session_count = 0
		session_failed_count = 0
		for session in self.sessions:
			try:
				session.update()
				session_count += 1
			except Exception as e:
				try:
					session.finish()
				except:
					pass
				session_failed_count += 1
				log.exception("sync", "Failed to update session.", e)
		log.debug("sync_update_all", "Updated %s sessions (%s failed) for sid %s." % (session_count, session_failed_count, sid))

		self.clear()

	def update_user(self, user_id):
		if not user_id in self.user_update_timers or not self.user_update_timers[user_id]:
			self.user_update_timers[user_id] = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=4), lambda: self._do_user_update(user_id))

	def _do_user_update(self, user_id):
		# clear() might wipe out the timeouts - let's make sure we don't waste resources
		# doing unnecessary updates
		if not user_id in self.user_update_timers or not self.user_update_timers[user_id]:
			return

		del self.user_update_timers[user_id]
		for session in self.find_user(user_id):
			try:
				log.debug("sync_update_user", "Updating user %s session." % session.user.id)
				session.update_user()
			except Exception as e:
				try:
					session.finish()
				except:
					pass
				log.exception("sync", "Session failed to be updated during update_user.", e)
			finally:
				self.remove(session)
		self.clean()

	def update_ip_address(self, ip_address):
		if not ip_address in self.ip_update_timers or not self.ip_update_timers[ip_address]:
			self.ip_update_timers[ip_address] = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=4), lambda: self._do_ip_update(ip_address))


	def _do_ip_update(self, ip_address):
		if not ip_address in self.ip_update_timers or not self.ip_update_timers[ip_address]:
			return

		del self.ip_update_timers[ip_address]
		for session in self.find_ip(ip_address):
			try:
				if session.user.is_anonymous():
					log.debug("sync_update_ip", "Updating IP %s" % session.request.remote_ip)
					session.update_user()
				else:
					log.debug("sync_update_ip", "Warning logged in user of potential mixup at IP %s" % session.request.remote_ip)
					session.anon_registered_mixup_warn()
			except Exception as e:
				try:
					session.finish()
				except:
					pass
				self.remove(session)
				log.exception("sync", "Session failed to be updated during update_user.", e)
		self.clean()

sessions = {}

def init():
	global sessions
	for sid in config.station_ids:
		sessions[sid] = SessionBank()
	tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=30), _keep_all_alive)

def _keep_all_alive():
	global sessions
	for sid in sessions:
		sessions[sid].keep_alive()

@handle_api_url("sync_update_all")
class SyncUpdateAll(APIHandler):
	local_only = True
	auth_required = False
	sid_required = False
	hidden = True

	def post(self):
		self.append("sync_all_result", "Processing.")

	def on_finish(self):
		global sessions

		if not self.get_status() == 200:
			log.debug("sync_update_all", "sync_update_all request was not OK.")
			return
		log.debug("sync_update_all", "Updating all sessions for sid %s" % self.sid)
		cache.update_local_cache_for_sid(self.sid)
		sessions[self.sid].update_all(self.sid)

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
		global sessions

		if not self.get_status() == 200:
			log.debug("sync_update_user", "sync_update_user request was not OK.")
			return

		user_id = long(self.get_argument("sync_user_id"))
		for sid in sessions:
			sessions[sid].clean()
			sessions[sid].update_user(user_id)

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
		global sessions

		if not self.get_status() == 200:
			log.debug("sync_update_ip", "sync_update_ip request was not OK.")
			return

		ip_address = self.get_argument("ip_address")
		for sid in sessions:
			sessions[sid].update_ip_address(ip_address)			

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

	def initialize(self, **kwargs):
		super(Sync, self).initialize(**kwargs)

	@tornado.web.asynchronous
	def post(self):
		global sessions

		if not cache.get_station(self.user.request_sid, "backend_ok") and not self.get_argument("offline_ack"):
			raise APIException("station_offline")

		self.set_header("Content-Type", "application/json")
		
		if not self.get_argument("resync"):
			if self.get_argument("known_event_id") and (cache.get_station(self.sid, "sched_current_dict")['id'] != self.get_argument("known_event_id")):
				self.update()
			else:
				sessions[self.sid].append(self)
		else:
			self.update()

	def keep_alive(self):
		self.write(" ")
		self.flush()

	def on_connection_close(self, *args, **kwargs):
		global sessions
		sessions[self.sid].remove(self)
		super(Sync, self).on_connection_close(*args, **kwargs)

	def on_finish(self, *args, **kwargs):
		global sessions
		sessions[self.sid].remove(self)
		super(Sync, self).on_finish(*args, **kwargs)

	def update(self):
		# Overwrite this value since who knows how long we've spent idling
		self._startclock = time.time()

		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh()
		api_requests.info.attach_info_to_request(self)
		self.finish()

	def update_user(self):
		self._startclock = time.time()

		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh()
		self.append("user", self.user.to_private_dict())
		self.finish()

	def anon_registered_mixup_warn(self):
		self.user.refresh()
		if not self.user.is_anonymous() and not self.user.is_tunedin():
			self.append_standard("redownload_m3u")
			self.finish()
			return True
		return False
