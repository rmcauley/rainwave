import socket
from tornado.httpclient import AsyncHTTPClient

from libs import log
from libs import config

# These HTTP calls must be asynchronous, otherwise if an API instance tries to call itself we'll wind up with
# a nasty case of deadlock.

def sync_frontend_all(sid):
	try:
		http_client = AsyncHTTPClient()
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			http_client.fetch("http://localhost:%s/api/sync_update_all" % (config.get("api_base_port") + i,), body=params)
			log.debug("sync_front", "Sent update_all to API port %s" % (config.get("api_base_port") + i,))
	except urllib2.URLError, e:
		log.warn("sync_front", "Could not connect to an API port: %s" % repr(e.reason))
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")

def sync_frontend_ip(ip_address):
	try:
		http_client = AsyncHTTPClient()
		params = urllib.urlencode({ "sid": sid, "ip_address": ip_address })
		for i in range(0, config.get("api_num_processes")):
			http_client.fetch("http://localhost:%s/api/sync_update_ip" % (config.get("api_base_port") + i,), body=params)
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")

def sync_frontend_user_id(user_id):
	# TODO: Syncing a front-end user should ALSO search for an IP just in case the user hasn't redownloaded their M3U
	try:
		http_client = AsyncHTTPClient()
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			http_client.fetch("http://localhost:%s/api/sync_update_user" % (config.get("api_base_port") + i,), body=params)
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")