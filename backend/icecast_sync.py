from xml.etree import ElementTree
import tornado.ioloop
import tornado.httpclient
from libs import cache
from libs import config
from libs import log
from libs import db

# A bunch of this code is setup to deal with asynchronous requests
# I didn't put in the effort to make it work that way.
# Good luck to you if you decide to resume that work. :)

in_process = {}

class IcecastSyncCallback(object):
	def __init__(self, relay_name, relay_info, ftype, sid, callback):
		self.relay_name = relay_name
		self.relay_info = relay_info
		self.sid = sid
		self.ftype = ftype
		self.callback = callback

	def process(self, response):
		global in_process

		if response.code != 200:
			log.warn("icecast_sync", "%s %s %s failed query: %s %s" % (self.relay_name, config.station_id_friendly[self.sid], self.ftype, response.code, response.reason))
			in_process[self] = True
			return None

		listeners = []
		for listener in ElementTree.fromstring(response.body).find("source").iter("listener"):
			listeners.append(listener)
		in_process[self] = listeners
		log.debug("icecast_sync", "%s %s %s count: %s" % (self.relay_name, config.station_id_friendly[self.sid], self.ftype, len(listeners)))

		# for asynchronous processing
		# for relay, data in in_process.iteritems():
		# 	print relay, data
		# 	if not data:
		# 		log.debug("icecast_sync", "%s %s not done yet." % (relay.relay_name, relay.sid))
		# 		return None
		# self.callback()

def _cache_relay_status():
	global in_process

	relays = {}
	for relay, relay_info in config.get("relays").iteritems():	#pylint: disable=W0612
		relays[relay] = 0

	for handler, data in in_process.iteritems():
		if isinstance(data, list):
			relays[handler.relay_name] += len(data)

	for relay, count in relays.iteritems():
		log.debug("icecast_sync", "%s total listeners: %s" % (relay, count))

	cache.set("relay_status", relays)

# Just do pure listener counts
def _count():
	global in_process

	log.debug("icecast_sync", "All responses came back for counting.")

	stations = {}
	for sid in config.station_ids:
		stations[sid] = 0

	for handler, data in in_process.iteritems():
		stations[handler.sid] += len(data)

	for sid, listener_count in stations.iteritems():
		log.debug("icecast_sync", "%s has %s listeners." % (config.station_id_friendly[sid], listener_count))
		db.c.update("INSERT INTO r4_listener_counts (sid, lc_guests) VALUES (%s, %s)", (sid, listener_count))

	_cache_relay_status()

	in_process = {}

# Sync r4_listeners table with what's on the relay
def _sync():
	# This whole system is broken for reasons I just don't understand
	# Listeners that ARE tuned in aren't in the database
	# as if Icecast never pinged the Rainwave servers properly
	global in_process
	_cache_relay_status()
	in_process = {}

def _start(callback):
	global in_process
	if in_process:
		log.warn("icecast_sync", "Previous operation did not finish!")

	stream_names = {}
	for sid in config.station_ids:
		stream_names[sid] = config.get_station(sid, 'stream_filename')

	for relay, relay_info in config.get("relays").iteritems():
		relay_base_url = "%s%s:%s/admin/listclients?mount=/" % (relay_info['protocol'], relay_info['ip_address'], relay_info['port'])
		for sid in relay_info['sids']:
			for ftype in ('.mp3', '.ogg'):
				try:
					handler = IcecastSyncCallback(relay, relay_info, ftype, sid, callback)
					in_process[handler] = False
					http_client = tornado.httpclient.HTTPClient()
					http_client.fetch(relay_base_url + stream_names[sid] + ftype,
										auth_username=relay_info['admin_username'],
										auth_password=relay_info['admin_password'],
										callback=handler.process)
				except Exception as e:
					log.exception("icecast_sync", "Could not sync %s %s.%s" % (relay, stream_names[sid], ftype), e)

	callback()

def start_count():
	_start(_count)