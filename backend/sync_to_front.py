import urllib
import json
from tornado.httpclient import AsyncHTTPClient

from libs import log
from libs import config

# These HTTP calls must be asynchronous, otherwise if an API instance tries to call itself we'll wind up with
# a nasty case of deadlock.

def sync_result(response):
	if response.error:
		try:
			js = json.loads(response.body)
			for k, v in js.iteritems():
				if u"text" in v:
					log.warn("sync_front", "%s: %s" % (k, v['text']))
		except Exception as e:
			pass
		log.warn("sync_front", "Error %s syncing to frontend at URL %s." % (response.code, response.request.url))
	else:
		log.debug("sync_front", "Sync to front successful.")

def sync_frontend_all(sid):
	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "sid": sid })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://localhost:%s/api4/sync_update_all" % (config.get("api_base_port") + i,), sync_result, method='POST', body=params)
		log.debug("sync_front", "Sent update_all to API port %s" % (config.get("api_base_port") + i,))

def sync_frontend_ip(ip_address):
	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "ip_address": ip_address })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://localhost:%s/api4/sync_update_ip" % (config.get("api_base_port") + i,), sync_result, method='POST', body=params)

def sync_frontend_user_id(user_id):
	# TODO: Syncing a front-end user should ALSO search for an IP just in case the user hasn't redownloaded their M3U
	http_client = AsyncHTTPClient()
	params = urllib.urlencode({ "sync_user_id": user_id })
	for i in range(0, config.get("api_num_processes")):
		http_client.fetch("http://127.0.0.1:%s/api4/sync_update_user" % (config.get("api_base_port") + i,), sync_result, method='POST', body=params)
