import tornado.web
import tornado.websocket
import tornado.ioloop
import datetime
import numbers
import sys
from time import time as timestamp

try:
	import ujson as json
except ImportError:
	import json

from api import fieldtypes
from api.exceptions import APIException
from api.web import APIHandler
from api.web import get_browser_locale
from api.server import api_endpoints
from api.server import handle_api_url
from rainwave.user import User
import api_requests.info
import rainwave.playlist

from libs import cache
from libs import log
from libs import config
from libs import zeromq

class SessionBank(object):
	def __init__(self):
		super(SessionBank, self).__init__()
		self.sessions = []
		self.websockets = []
		self.throttled = {}

	def __iter__(self):
		for item in self.sessions:
			yield item

	def append(self, session):
		if session.is_websocket:
			if not session in self.websockets:
				self.websockets.append(session)
		elif not session in self.sessions:
			self.sessions.append(session)

	def remove(self, session):
		if session in self.throttled:
			tornado.ioloop.IOLoop.instance().remove_timeout(self.throttled[session])
			del(self.throttled[session])
		if session in self.websockets:
			self.websockets.remove(session)
		elif session in self.sessions:
			self.sessions.remove(session)

	def clear(self):
		for timer in self.throttled.itervalues():
			tornado.ioloop.IOLoop.instance().remove_timeout(timer)
		self.sessions[:] = []
		self.throttled.clear()

	def find_user(self, user_id):
		toret = []
		for session in self.sessions + self.websockets:
			if session.user.id == user_id:
				toret.append(session)
		return toret

	def find_ip(self, ip_address):
		toret = []
		for session in self.sessions + self.websockets:
			if session.request.remote_ip == ip_address:
				toret.append(session)
		return toret

	def keep_alive(self):
		for session in self.sessions + self.websockets:
			try:
				session.keep_alive()
			except Exception as e:
				session.finish()
				log.exception("sync", "Session failed keepalive.", e)

	def update_all(self, sid):
		session_count = 0
		session_failed_count = 0
		for session in self.sessions + self.websockets:
			try:
				session.update()
				session_count += 1
			except Exception as e:
				try:
					session.finish()
				except:
					pass
				session_failed_count += 1
				log.exception("sync_update_all", "Failed to update session.", e)
		log.debug("sync_update_all", "Updated %s sessions (%s failed) for sid %s." % (session_count, session_failed_count, sid))

		self.clear()

	def update_dj(self):
		for session in self.websockets:
			if session.user.is_dj():
				try:
					session.update_dj_only()
					log.debug("sync_update_dj", "Updated user %s session." % session.user.id)
				except Exception as e:
					try:
						session.finish()
					except:
						pass
					log.exception("sync_update_dj", "Session failed to be updated during update_dj.", e)

	# this function is only called when the user's tune_in status changes
	# though it does send an update for the whole user() object if the situation
	# is correct
	def _do_user_update(self, session, updated_by_ip):
		# clear() might wipe out the timeouts for a bigger update (that includes user update anyway!)
		# don't bother updating again if that's already happened
		if not session in self.throttled:
			return
		del(self.throttled[session])

		try:
			potential_mixup_warn = updated_by_ip and not session.user.is_anonymous() and not session.user.is_tunedin()
			session.refresh_user()
			if potential_mixup_warn and not session.user.is_tunedin():
				log.debug("sync_update_ip", "Warning logged in user of potential M3U mixup at IP %s" % session.request.remote_ip)
				session.login_mixup_warn()
			else:
				session.update_user()
		except Exception as e:
			log.exception("sync", "Session failed to be updated during update_user.", e)
			try:
				session.finish()
			except Exception:
				log.exception("sync", "Session failed finish() during update_user.", e)

	def _throttle_session(self, session, updated_by_ip=False):
		if not session in self.throttled:
			self.throttled[session] = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=2), lambda: self._do_user_update(session, updated_by_ip))

	def update_user(self, user_id):
		# throttle rapid user updates - usually when a user does something like
		# switch relays on their media player this can happen.
		for session in self.find_user(user_id):
			self._throttle_session(session)

	def update_ip_address(self, ip_address):
		for session in self.find_ip(ip_address):
			self._throttle_session(session, True)

sessions = {}

def init():
	tornado.ioloop.PeriodicCallback(_keep_all_alive, 30000).start()
	zeromq.set_sub_callback(_on_zmq)
	global sessions
	for sid in config.station_ids:
		sessions[sid] = SessionBank()

def _keep_all_alive():
	global sessions
	for sid in sessions:
		sessions[sid].keep_alive()

def _on_zmq(message):
	try:
		message = json.loads(message)
	except Exception as e:
		log.exception("zeromq", "Error decoding ZeroMQ message.", e)
		return

	if not 'action' in message or message['action']:
		log.critical("zeromq", "No action received from ZeroMQ.")

	try:
		if message['action'] == "update_all":
			rainwave.playlist.update_num_songs()
			rainwave.playlist.prepare_cooldown_algorithm(message['sid'])
			cache.update_local_cache_for_sid(message['sid'])
			sessions[message['sid']].update_all(message['sid'])
		elif message['action'] == "update_ip":
			for sid in sessions:
				sessions[sid].update_ip_address(message['ip'])
		elif message['action'] == "update_user":
			for sid in sessions:
				sessions[sid].update_user(message['user_id'])
		elif message['action'] == "update_dj":
			sessions[message['sid']].update_dj()
	except Exception as e:
		log.exception("zeromq", "Error handling Zero MQ action '%s'" % message['action'], e)
		return

@handle_api_url("sync")
class Sync(APIHandler):
	description = ("Presents the same information as the 'info' requests, but will wait until the next song change in order to deliver the information. "
					"Will send whitespace every 20 seconds in a bid to keep the connection alive.  Use offline_ack to have the connection long poll until "
					"the station is back online, and use resync to get all information immediately rather than waiting.  known_event_id can be added "
					"to the request - if the currently playing event ID (i.e. sched_current.id) is different than the one provided, information will be sent immediately. "
					"This allows for gaps inbetween requests to be handled elegantly.")
	auth_required = True
	fields = { "offline_ack": (fieldtypes.boolean, None), "resync": (fieldtypes.boolean, None), "known_event_id": (fieldtypes.positive_integer, None) }
	is_websocket = False

	@tornado.web.asynchronous
	def post(self):
		global sessions

		if self.user.is_dj():
			self.dj = True
		else:
			self.dj = False

		api_requests.info.check_sync_status(self.sid, self.get_argument("offline_ack"))

		self.set_header("Content-Type", "application/json")

		if not self.get_argument("resync"):
			if self.get_argument("known_event_id") and cache.get_station(self.sid, "sched_current_dict") and (cache.get_station(self.sid, "sched_current_dict")['id'] != self.get_argument("known_event_id")):
				self.update()
			else:
				sessions[self.sid].append(self)
		else:
			self.update()

	def keep_alive(self):
		self.write(" ")
		self.flush()

	def on_connection_close(self, *args, **kwargs):
		if self.sid:
			global sessions
			sessions[self.sid].remove(self)
		super(Sync, self).on_connection_close(*args, **kwargs)

	def finish(self, *args, **kwargs):
		if self.sid:
			global sessions
			sessions[self.sid].remove(self)
		super(Sync, self).finish(*args, **kwargs)

	def refresh_user(self):
		self.user.refresh(self.sid)

	def update(self):
		# Overwrite this value since who knows how long we've spent idling
		self._startclock = timestamp()

		if not cache.get_station(self.sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh(self.sid)
		if "requests_paused" in self.user.data:
			del self.user.data['requests_paused']
		api_requests.info.attach_info_to_request(self)
		self.finish()

	def update_user(self):
		self._startclock = timestamp()

		if not cache.get_station(self.sid, "backend_ok"):
			raise APIException("station_offline")

		self.user.refresh(self.sid)
		if "requests_paused" in self.user.data:
			del self.user.data['requests_paused']
		self.append("user", self.user.to_private_dict())
		self.finish()

	def login_mixup_warn(self):
		self.append("redownload_m3u", { "tl_key": "redownload_m3u", "text": self.locale.translate("redownload_m3u") })
		self.finish()

class FakeRequestObject(object):
	def __init__(self, arguments, cookies):
		self.arguments = arguments
		self.cookies = cookies

# TODO: Special payload updates for live voting/etc

@handle_api_url("websocket/(\d+)")
class WSHandler(tornado.websocket.WebSocketHandler):
	is_websocket = True
	local_only = False
	help_hidden = False
	locale = None
	sid = None

	def open(self, *args, **kwargs):
		super(WSHandler, self).open()
		try:
			self.sid = int(args[0])
		except Exception:
			pass

		if not self.sid:
			self.write_message({ "wserror": { "tl_key": "missing_station_id", "text": self.locale.translate("missing_station_id") } })
			return
		if not self.sid in config.station_ids:
			self.write_message({ "wserror": { "tl_key": "invalid_station_id", "text": self.locale.translate("invalid_station_id") } })
			return

		self.locale = get_browser_locale(self)

		self.authorized = False

	# overwrites a not supported method and redirects it to self.close
	# allows websocket sessions to be called exactly the same as HTTP handlers
	# in the session bank class
	def finish(self):		#pylint: disable=W0221
		self.close()

	def keep_alive(self):
		self.write_message({ "wsping": { "timestamp": timestamp() }})

	def on_close(self):
		global sessions
		sessions[self.sid].remove(self)
		super(WSHandler, self).on_close()

	def write_message(self, obj, *args, **kwargs):
		message = json.dumps(obj)
		try:
			super(WSHandler, self).write_message(message, *args, **kwargs)
		except tornado.websocket.WebSocketClosedError:
			self.on_close()
		except tornado.websocket.WebSocketError as e:
			log.exception("websocket", "WebSocket Error", e)
			try:
				self.close()
			except Exception:
				self.on_close()

	def refresh_user(self):
		self.user.refresh(self.sid)
		# TODO: DJ permission checks

	def on_message(self, message):
		try:
			message = json.loads(message)
		except:
			self.write_message({ "wserror": { "tl_key": "invalid_json", "text": self.locale.translate("invalid_json") } })
			return

		if not "action" in message or not message['action']:
			self.write_message({ "wserror": { "tl_key": "missing_argument", "text": self.locale.translate("missing_argument", argument="action") } })
			return

		if not self.authorized and message['action'] != "auth":
			self.write_message({ "wserror": { "tl_key": "auth_required", "text": self.locale.translate("auth_required") } })
			return

		if message['action'] == "auth":
			self._do_auth(message)
			return

		if message['action'] == "check_sched_current_id":
			self._do_sched_check(message)
			return

		if message['action'] == "wspong":
			# TODO: Check ping/pong values...?  I don't think it's necessary.
			return

		message['action'] = "/api4/%s" % message['action']
		if not message['action'] in api_endpoints:
			self.write_message({ "wserror": { "tl_key": "websocket_404", "text": self.locale.translate("websocket_404") } })
			return

		endpoint = api_endpoints[message['action']](websocket=True)
		endpoint.locale = self.locale
		endpoint.request = FakeRequestObject(message, self.request.cookies)
		endpoint.sid = message['sid'] if 'sid' in message else self.sid
		endpoint.user = self.user
		try:
			startclock = timestamp()
			if "message_id" in message:
				if not fieldtypes.zero_or_greater_integer(message['message_id']):
					endpoint.prepare_standalone()
					raise APIException("invalid_argument", argument="message_id", reason=fieldtypes.zero_or_greater_integer_error, http_code=400)
				endpoint.prepare_standalone(fieldtypes.zero_or_greater_integer(message['message_id']))
			else:
				endpoint.prepare_standalone()
			endpoint.post()
			endpoint.append("api_info", { "exectime": timestamp() - startclock, "time": round(timestamp()) })
		except Exception as e:
			endpoint.write_error(500, exc_info=sys.exc_info(), no_finish=True)
			log.exception("websocket", "API Exception during operation.", e)
		finally:
			self.write_message(endpoint._output) 	#pylint: disable=W0212

	def update(self):
		handler = APIHandler(websocket=True)
		handler.locale = self.locale
		handler.request = FakeRequestObject({}, self.request.cookies)
		handler.sid = self.sid
		handler.user = self.user
		handler.return_name = "sync_result"
		try:
			startclock = timestamp()
			handler.prepare_standalone()

			if not cache.get_station(self.sid, "backend_ok"):
				raise APIException("station_offline")

			self.refresh_user()
			api_requests.info.attach_info_to_request(handler)
			if self.user.is_dj():
				api_requests.info.attach_dj_info_to_request(handler)
			handler.append("user", self.user.to_private_dict())
			handler.append("api_info", { "exectime": timestamp() - startclock, "time": round(timestamp()) })
		except Exception as e:
			if handler:
				handler.write_error(500, exc_info=sys.exc_info(), no_finish=True)
			log.exception("websocket", "Exception during update.", e)
		finally:
			if handler:
				self.write_message(handler._output) 	#pylint: disable=W0212

	def update_user(self):
		self.write_message({ "user": self.user.to_private_dict() })

	def login_mixup_warn(self):
		self.write_message({ "sync_result": { "tl_key": "redownload_m3u", "text": self.locale.translate("redownload_m3u") } })

	def _do_auth(self, message):
		if not "user_id" in message or not message['user_id']:
			self.write_message({ "wserror": { "tl_key": "missing_argument", "text": self.locale.translate("missing_argument", argument="user_id") } })
		if not isinstance(message['user_id'], numbers.Number):
			self.write_message({ "wserror": { "tl_key": "invalid_argument", "text": self.locale.translate("invalid_argument", argument="user_id") } })
		if not "key" in message or not message['key']:
			self.write_message({ "wserror": { "tl_key": "missing_argument", "text": self.locale.translate("missing_argument", argument="key") } })

		self.user = User(message['user_id'])
		self.user.ip_address = self.request.remote_ip
		self.user.authorize(None, message['key'])
		if not self.user.authorized:
			self.write_message({ "wserror": { "tl_key": "auth_failed", "text": self.locale.translate("auth_failed") } })
			self.close()
			return
		self.authorized = True

		global sessions
		sessions[self.sid].append(self)

		self.refresh_user()
		# no need to send the user's data to the user as that would have come with bootstrap
		# and will come with each synchronization of the schedule anyway
		self.write_message({ "wsok": True })
		# since this will be the first action in any websocket interaction though,
		# it'd be a good time to send a station offline message.
		self._station_offline_check()

	def _station_offline_check(self):
		if not cache.get_station(self.sid, "backend_ok"):
			# shamelessly fake an error.
			self.write_message({ "sync_result": { "tl_key": "station_offline", "text": self.locale.translate("station_offline") } })

	def _do_sched_check(self, message):
		if not "sched_id" in message or not message['sched_id']:
			self.write_message({ "wserror": { "tl_key": "missing_argument", "text": self.locale.translate("missing_argument", argument="sched_id") } })
			return
		if not isinstance(message['sched_id'], numbers.Number):
			self.write_message({ "wserror": { "tl_key": "invalid_argument", "text": self.locale.translate("invalid_argument", argument="sched_id") } })

		self._station_offline_check()

		if cache.get_station(self.sid, "sched_current_dict") and (cache.get_station(self.sid, "sched_current_dict")['id'] != message['sched_id']):
			self.update()
