import urllib
try:
	import ujson as json
except ImportError:
	import json
import datetime
from tornado.httpclient import AsyncHTTPClient
from tornado.ioloop import IOLoop

from libs import log
from libs import config

# These HTTP calls must be asynchronous, otherwise if an API instance tries to call itself we'll wind up with
# a nasty case of deadlock.

# TODO: start using ZeroMQ maybe?

front_sched_sync_timers = {}
front_sched_dj_timers = {}

def sync_result(response):
	if response.error:
		try:
			js = json.loads(response.body)
			for k, v in js.iteritems():
				if u"text" in v:
					log.warn("sync_front", "%s: %s" % (k, v['text']))
		except:
			pass
		log.warn("sync_front", "Error %s syncing to frontend at URL %s." % (response.code, response.request.url))

def sync_frontend_all(sid):
	_sync_frontend_all_timed_stop(sid)

	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "sid": sid })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://%s:%s/api4/sync_update_all" % (config.get("api_url"), config.get("api_base_port") + i,), sync_result, method='POST', body=params)
		log.debug("sync_front", "Sent update_all to API port %s" % (config.get("api_base_port") + i,))

def sync_frontend_ip(ip_address):
	http_client = AsyncHTTPClient()
	# the sid here is for local testing purposes
	params = urllib.urlencode({ "ip_address": ip_address, "sid": 1 })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://%s:%s/api4/sync_update_ip" % (config.get("api_url"), config.get("api_base_port") + i,), sync_result, method='POST', body=params)

def sync_frontend_user_id(user_id):
	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "sync_user_id": user_id, "sid": 1 })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://%s:%s/api4/sync_update_user" % (config.get("api_url"), config.get("api_base_port") + i,), sync_result, method='POST', body=params)

def sync_frontend_dj(sid):
	global front_sched_dj_timers
	front_sched_dj_timers[sid] = None

	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "sid": sid })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://%s:%s/api4/sync_update_dj" % (config.get("api_url"), config.get("api_base_port") + i,), sync_result, method='POST', body=params)


# These only update schedules for all end users, and are here so admins can update things like
# adding 1ups and the user's screens will reflect that.  They run with delayed timers so admins
# can queue up a bunch of things all at once and the system won't overwhelm itself.
def sync_frontend_all_timed(sid):
	global front_sched_sync_timers

	if sid in front_sched_sync_timers and front_sched_sync_timers[sid]:
		_sync_frontend_all_timed_stop(sid)
	front_sched_sync_timers[sid] = IOLoop.instance().add_timeout(datetime.timedelta(seconds=5), lambda: sync_frontend_all(sid))

def _sync_frontend_all_timed_stop(sid):
	global front_sched_sync_timers

	if sid in front_sched_sync_timers and front_sched_sync_timers[sid]:
		IOLoop.instance().remove_timeout(front_sched_sync_timers[sid])
	front_sched_sync_timers[sid] = None

def sync_frontend_dj_timed(sid):
	global front_sched_dj_timers

	# This rate limits DJ updating requests
	if sid in front_sched_dj_timers and front_sched_dj_timers[sid]:
		return

	front_sched_dj_timers[sid] = IOLoop.instance().add_timeout(datetime.timedelta(seconds=5), lambda: sync_frontend_dj(sid))