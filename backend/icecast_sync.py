from xml.etree import ElementTree
import tornado.ioloop
import tornado.httpclient
from libs import config
from libs import log
from libs import db

all_returned = {}
listener_ids = {}
blargh = None

# This module was designed for asynchronous operation, but that turned out to be a huge
# pain in the ass that I couldn't get working.  I'm lacking some critical piece of knowledge here.

def _process():
	global all_returned
	global listener_ids
	
	checked = 0
	pruned = 0
	for bare_relay in all_returned:
		relay = bare_relay.split("_")[0]
		for listener_id in db.c.fetch_list("SELECT listener_icecast_id FROM r4_listeners WHERE listener_relay = %s AND listener_purge = FALSE", (relay,)):
			checked += 1
			if not listener_id in listener_ids[relay]:
				log.debug("icecast_sync", "Pruning listener ID %s from relay %s." % (listener_id, relay))
				pruned += 1
				db.c.update("DELETE FROM r4_listeners WHERE listener_icecast_id = %s AND listener_relay = %s", (listener_id, relay))
	all_returned = {}
	listener_ids = {}

class IcecastSyncCallback(object):
	def __init__(self, relay_name, relay_info, stream_key, sid):
		self.relay_name = relay_name
		self.stream_key = stream_key
		self.relay_info = relay_info
		self.sid = sid

	def respond(self, response):
		global all_returned
		global listener_ids
		
		if response.code != 200:
			log.warn("icecast_sync", "%s %s failed query: %s %s" % (self.relay_name, self.stream_key, response.code, response.reason))
			return
		
		root = ElementTree.fromstring(response.body)
		for listener in root.find("source").iter("listener"):
			if 'id' in listener.attrib:
				listener_ids[self.relay_name].append(long(listener.attrib['id']))
			
		all_returned[self.stream_key] = True
		
		# self.check_all_returned()
		
	# def check_all_returned(self):
		# global all_returned
		
		# for relay_sid, value in all_returned.iteritems():
			# if not value:
				# return False
		# _process()

def start_icecast_sync():
	global all_returned
	global listener_ids
	global blargh
	
	stream_names = {}
	for sid in config.station_ids:
		stream_names[sid] = config.get_station(sid, 'stream_filename')
	
	if all_returned:
		log.warn("icecast_sync", "Previous operation did not finish!")

	all_returned = {}
	listener_ids = {}
	for relay, relay_info in config.get("relays").iteritems():
		listener_ids[relay] = []
		relay_base_url = "%s%s:%s/admin/listclients?mount=/" % (relay_info['protocol'], relay_info['ip_address'], relay_info['port'])
		for sid in relay_info['sids']:
			all_returned["%s_%s_mp3" % (relay, sid)] = False
			handler = IcecastSyncCallback(relay, relay_info, "%s_%s_mp3" % (relay, sid), sid)
			http_client = tornado.httpclient.HTTPClient()
			http_client.fetch(relay_base_url + stream_names[sid] + ".mp3",
				                         auth_username=relay_info['admin_username'],
										 auth_password=relay_info['admin_password'],
			                             callback=handler.respond)

			all_returned["%s_%s_ogg" % (relay, sid)] = False
			handler2 = IcecastSyncCallback(relay, relay_info, "%s_%s_ogg" % (relay, sid), sid)
			http_client2 = tornado.httpclient.HTTPClient()
			http_client2.fetch(relay_base_url + stream_names[sid] + ".ogg",
				                         auth_username=relay_info['admin_username'],
										 auth_password=relay_info['admin_password'],
			                             callback=handler.respond)
	_process()
							  

# Nope - don't use this until the entire module is setup to be fully async and working that way
# sync = tornado.ioloop.PeriodicCallback(start_icecast_sync, 30000)
# sync.start()
