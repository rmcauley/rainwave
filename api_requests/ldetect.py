from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_url
import api.returns

from libs import cache
from libs import log

# Sample Icecast query:
# &server=myserver.com&port=8000&client=1&mount=/live&user=&pass=&ip=127.0.0.1&agent="My%20player"

class IcecastHandler(RequestHandler):
	fields = {
		"server": (fieldtypes.string, True),
		"port": (fieldtypes.integer, True),
		"client": (fieldtypes.integer, True),
		"mount": (fieldtypes.string, True),
		"user": (fieldtypes.string, True),
		"pass": (fieldtypes.string, True),
		"ip": (fieldtypes.string, True),
		"agent": (fieldtypes.string, True)
	}
	sid_required = False
	auth_required = False
	
	def prepare(self):
		if not fieldtypes.valid_relay(self.request.remote_ip):
			self.failed = True
			self.set_status(403)
			self.finish()
			return
		super(RequestHandler, self).prepare()
		
		m = re.search(r"^/(?P<mount>[\d\w\-.]+)(\?(?P<user>\d+):(?P<key>[\d\w]+))?(?:\?\d+\.(?:mp3|ogg))?$", request.get_argument("mount"))
		if m:
			rd = m.groupdict()
			self.arguments['mount'] = rd["mount"]
			if "user" in rd and rd["user"]:
				self.arguments['user'] = long(rd["user"])
				self.arguments['listen_key'] = rd["key"]
			else:
				self.arguments['user'] = 1
				
		ua = request.get_argument("agent").lower()
		if ua.find("foobar"):
			self.request.arguments['agent'] = "Foobar2000"
		elif ua.find("winamp"):
			self.request.arguments['agent'] = "Winamp"
		elif ua.find("vlc") or ua.find("videolan"):
			self.request.arguments['agent'] = "VLC"
		elif ua.find("xine"):
			self.request.arguments['agent'] = "Xine"
		elif ua.find("fstream"):
			self.request.arguments['agent'] = "Fstream"
		elif ua.find("bass"):
			self.request.arguments['agent'] = "BASS/XMplay"
		elif ua.find("xion"):
			self.request.arguments['agent'] = "Xion"
		elif ua.find("itunes"):
			self.request.arguments['agent'] = "iTunes"
		elif ua.find('muses'):
			self.request.arguments['agent'] = "Flash Player"
		elif ua.find('windows'):
			self.request.arguments['agent'] = "Windows Media"
		else:
			self.request.arguments['agent'] = "Unknown"
	
	def finish(self, chunk = None):
		if self.failed:
			self.set_header("icecast-auth-user", "1")
		else:
			self.set_header("icecast-auth-user", "0")
			
	def append(self, object):
		globals.debug("ldetect", object, self.user)
		self.set_header("icecast-auth-message", message)
		self.set_debug_message(repr(object))

@handle_url("listener_add/(\d+)")		
class AddListener(IcecastHandler):
	def get(self, sid):
		if self.arguments['user'] > 1:
			self.add_registered(sid)
		else:
			self.add_anonymous(sid)
	
	def add_registered(self, sid):
		tunedin = db.fetchvar("SELECT COUNT(*) FROM rw_listeners WHERE user_id = %s", (self.user_id,))
		if tunedin:
			db.update(
				"UPDATE rw_listeners "
				"SET sid = %s, list_purge = FALSE, list_icecast_id = %s, list_relay = %s, list_agent = %s "
				"WHERE user_id = %s",
				(sid, self.relay_client_id, self.relay, self.agent, self.user_id))
			self.icecast(True, "Registered user's record updated.")
		else:
			sched_id = globals.cache.get(sid, globals.JSONName.current)['sched_id']
			active = db.fetchvar("SELECT COUNT(*) FROM rw_votehistory WHERE user_id = %s AND sched_id = %s", (self.user_id, sched_id))
			if active:
				active = True
			else:
				active = False
			db.update("INSERT INTO rw_listeners "
				"(sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id, list_active) "
				"VALUES (%s, %s, %s, %s, %s, %s, %s)",
				(sid, self.listener_ip, self.user_id, self.relay, self.agent, self.relay_client_id, active))
			self.icecast(True, "Registered user is now tuned in.")
		qcount = db.fetchvar("SELECT COUNT(*) FROM rw_request_queue JOIN rw_songs USING (song_id) WHERE rw_songs.sid = %s AND user_id = %s AND song_available = TRUE", (sid, self.user_id))
		if qcount > 0:
			in_line = db.fetchvar("SELECT COUNT(*) FROM rw_requests WHERE user_id = %s AND request_fulfilled_at = 0", (self.user_id,))
			if in_line == 0:
				db.update("INSERT INTO rw_requests (sid, user_id) VALUES (%s, %s)", (sid, self.user_id))
			else:
				db.update("UPDATE rw_requests SET request_tunedin_expiry = NULL WHERE user_id = %s", (self.user_id,))
		globals.sendUserSignal(self.user_id)
		
	def add_anonymous(self, sid):
		if db.fetchvar("SELECT COUNT(*) FROM rw_listeners WHERE list_ip_address = %s AND list_purge = FALSE", (self.listener_ip,)) == 0:
			db.update(
				"INSERT INTO rw_listeners (sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id) "
				"VALUES (%s, %s, %s, %s, %s, %s)",
				(sid, self.listener_ip, 1, self.relay, self.agent, self.relay_client_id))
			globals.sendUserIPSignal(self.listener_ip)
			self.icecast(True, "Anonymous user is now tuned in with record.")
		else:
			self.icecast(True, "Anonymous user tuned in without record.")
			
@handle_url("listener_remove/(\d+)")
class RemoveListener(IcecastHandler):
	def get(self, sid):
		listener = db.fetchrow("SELECT user_id, list_ip_address FROM rw_listeners WHERE list_icecast_id = %s AND list_relay = %s", (self.relay_client_id, self.relay))
		if not listener:
			return self.icecast(True, "No user record to delete.")
		db.update("UPDATE rw_listeners SET list_purge = TRUE WHERE list_icecast_id = %s AND list_relay = %s", (self.relay_client_id, self.relay))
		self.icecast(True, "Listener record flagged for removal.")
		if listener['user_id'] > 1:
			globals.sendUserSignal(listener['user_id'])
		else:
			globals.sendUserIPSignal(listener['list_ip_address'])
