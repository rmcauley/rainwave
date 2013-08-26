import tornado.httpclient
from libs import config
from libs import log

all_returned = {}
stream_names = [ None, "beta", "ocremix", "covers", "chiptune", "all" ]

def _process():
	print "All came back OK, processing."
	all_returned = None

class IcecastSyncCallback(object):
	def __init__(self, relay_name, relay_info, stream_key, sid):
		self.relay_name = relay_name
		self.stream_key = stream_key
		self.relay_info = relay_info
		self.sid = sid

	def respond(self, response):
		global all_returned
		all_returned[self.stream_key] = True
		
		print "%s came back OK" % self.stream_key
		
		self.check_all_returned()
		
	def check_all_returned(self):
		global all_returned
		
		for relay_sid, value in all_returned.iteritems():
			print "Hmm: %s %s" % (relay_sid, value)
			if not value:
				return False
		_process()

def start_icecast_sync():
	global all_returned
	
	if all_returned:
		log.warn("icecast_sync", "Previous operation did not finish!")

	all_returned = {}
	for relay, relay_info in config.get("relays").iteritems():
		relay_base_url = "%s%s:%s/admin/listclients?mount=/" % (relay_info['protocol'], relay_info['ip_address'], relay_info['port'])
		for sid in relay_info['sids']:
			# Commented out since the beta version of the site doesn't do MP3
			#all_returned["%s_%s_mp3" % (relay, sid)] = False
			#handler = IcecastSyncCallback(relay, relay_info, "%s_%s_mp3" % (relay, sid), sid)
			#http_client = tornado.httpclient.AsyncHTTPClient()
			#http_client.fetch(relay_base_url + stream_names[sid] + ".mp3",
			#				  handler.respond,
			#				  auth_username=relay_info['admin_username'],
			#				  auth_password=relay_info['admin_password'])

			all_returned["%s_%s_ogg" % (relay, sid)] = False
			handler2 = IcecastSyncCallback(relay, relay_info, "%s_%s_ogg" % (relay, sid), sid)
			http_client2 = tornado.httpclient.AsyncHTTPClient()
			http_client2.fetch(relay_base_url + stream_names[sid] + ".ogg",
							  handler2.respond,
							  auth_username=relay_info['admin_username'],
							  auth_password=relay_info['admin_password'])
			print "Fired off request for %s_%s_ogg" % (relay, sid)

# Disabled until fully working			
#sync = tornado.ioloop.PeriodicCallback(start_icecast_sync, 30000)
#sync.start()
