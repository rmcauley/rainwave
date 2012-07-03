import urllib
import httplib

from libs import log
from libs import config

def sync_frontend_all(sid):
	headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
	params = urllib.urlencode({ "sid": sid })
	for i in range(0, config.get("num_processes")):
		conn = httplib.HTTPConnection('localhost', config.get("base_port") + i)
		conn.request("GET", "/api/sync_update_all", params, headers)

def sync_frontend_ip(ip_address):
	headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
	params = urllib.urlencode({ "sid": sid, "ip_address": ip_address })
	for i in range(0, config.get("num_processes")):
		conn = httplib.HTTPConnection('localhost', config.get("base_port") + i)
		conn.request("GET", "/api/sync_update_ip", params, headers)

def sync_frontend_user_id(user_id):
	headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
	params = urllib.urlencode({ "sid": sid })
	for i in range(0, config.get("num_processes")):
		conn = httplib.HTTPConnection('localhost', config.get("base_port") + i)
		conn.request("GET", "/api/sync_update_user", params, headers)
