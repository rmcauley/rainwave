import tornado.web
import tornado.ioloop
import datetime

from api import fieldtypes
from api.exceptions import APIException
from api.web import APIHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
from api import fieldtypes
import api_requests.info

from libs import cache
from libs import log
from rainwave import playlist

sessions = {}

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
		sessions[self.sid] = []

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

		user_id = self.get_argument("sync_user_id")
		for sid in sessions:
			for session in sessions[sid]:
				if session.user.id == user_id:
					log.debug("sync_update_user", "Updating user %s session." % user_id)
					session.update_user()
					sessions[sid].remove(session)
					return

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
					sessions[sid].remove(session)
					return
				elif session.request.remote_ip == ip_address:
					log.debug("sync_update_ip", "Warning logged in user of potential mixup at IP %s" % ip_address)
					if session.anon_registered_mixup_warn():
						sessions[sid].remove(session)

@handle_api_url("sync")
class Sync(APIHandler):
	description = ("Presents the same information as the 'info' requests, but will wait until the next song change in order to deliver the information. "
					"Will send whitespace every 20 seconds in a bid to keep the connection alive.")
	auth_required = True

	@tornado.web.asynchronous
	def post(self):
		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		global sessions
		self.keep_alive_handle = None

		self.set_header("Content-Type", "application/json")
		if not self.user.request_sid in sessions:
			sessions[self.user.request_sid] = []
		sessions[self.user.request_sid].append(self)
		self.keep_alive()

	def update(self):
		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		if self.keep_alive_handle:
			tornado.ioloop.IOLoop.instance().remove_timeout(self.keep_alive_handle)
		api_requests.info.attach_info_to_request(self)
		self.finish()

	def update_user(self):
		if not cache.get_station(self.user.request_sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh()
		self.append("user", self.user.to_private_dict())
		self.finish()

	def keep_alive(self):
		self.write(" ")
		self.keep_alive_handle = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=20), self.keep_alive)

	def anon_registered_mixup_warn(self):
		self.user.refresh()
		if not self.user.is_anonymous() and not self.user.is_tunedin():
			self.append_standard("redownload_m3u")
			return True
		return False

