import urllib
import httplib
import socket

from libs import log
from libs import config

def sync_frontend_all(sid):
	try:
		headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			conn = httplib.HTTPConnection('localhost', config.get("api_base_port") + i)
			conn.request("GET", "/api/sync_update_all", params, headers)
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
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")

def sync_frontend_user_id(user_id):
	try:
		headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
		params = urllib.urlencode({ "sid": sid })
		for i in range(0, config.get("api_num_processes")):
			conn = httplib.HTTPConnection('localhost', config.get("api_base_port") + i)
			conn.request("GET", "/api/sync_update_user", params, headers)
	except socket.error:
		log.warn("sync_front", "Could not connect to an API port.")
	except socket.timeout:
		log.warn("sync_front", "Timeout connecting to an API port.")