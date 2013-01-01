import urllib
import urllib2
import socket

from libs import log
from libs import config

def sync_frontend_all(sid):
	try:
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			urllib2.urlopen(urllib2.Request("http://localhost:%s/api/sync_update_all" % (config.get("api_base_port") + i,), params))
			log.debug("sync_front", "Sent update_all to API port %s" % (config.get("api_base_port") + i,))
	except urllib2.URLError, e:
		log.warn("sync_front", "Could not connect to an API port: %s" % repr(e.reason))
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")

def sync_frontend_ip(ip_address):
	try:
		headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
		params = urllib.urlencode({ "sid": sid, "ip_address": ip_address })
		for i in range(0, config.get("api_num_processes")):
			conn = httplib.HTTPConnection('localhost', config.get("api_base_port") + i)
			conn.request("GET", "/api/sync_update_ip", params, headers)
			conn.close()
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")

def sync_frontend_user_id(user_id):
	# TODO: Syncing a front-end user should ALSO search for an IP just in case the user hasn't redownloaded their M3U
	try:
		headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			conn = httplib.HTTPConnection('localhost', config.get("api_base_port") + i)
			conn.request("GET", "/api/sync_update_user", params, headers)
			conn.close()
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")