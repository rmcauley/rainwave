import urllib
import json
from tornado.httpclient import AsyncHTTPClient
from tornado.ioloop import IOLoop

from libs import log
from libs import config

def sync_result(response):
	if response.error:
		log.warn("sync_back", "Response: %s" % response.body)
		log.warn("sync_back", "Error %s syncing to backend at URL %s." % (response.code, response.request.url))

# def refresh_schedule(sid):
# 	http_client = AsyncHTTPClient()
# 	http_client.fetch("http://localhost:%s/refresh/%s" % (config.get("backend_port"), sid), sync_result, method='GET')
# 	log.debug("sync_back", "Sent refresh_schedule to backend port %s" % config.get("backend_port"))
