import re

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
	sid_required = False
	auth_required = False
	
	def prepare(self):
		self.failed = True    # Assume failure unless otherwise told
		self.user_id = None
		self.mount = None
		self.agent = None
		self.listen_key = None
		
		if not fieldtypes.valid_relay(self.request.remote_ip):
			self.set_status(403)
			self.append("%s is not a valid relay." % self.request.remote_ip)
			self.finish()
			return
		super(RequestHandler, self).prepare()
		
		m = re.search(r"^/(?P<mount>[\d\w\-.]+)(\?(?P<user>\d+):(?P<key>[\d\w]+))?(?:\?\d+\.(?:mp3|ogg))?$", self.get_argument("mount"))
		if m:
			rd = m.groupdict()
			self.mount = rd["mount"]
			if "user" in rd and rd["user"]:
				self.user_id = long(rd["user"])
				self.listen_key = rd["key"]
			else:
				self.user_id = 1
				
		ua = self.get_argument("agent").lower()
		if ua.find("foobar"):
			self.agent = "Foobar2000"
		elif ua.find("winamp"):
			self.agent = "Winamp"
		elif ua.find("vlc") or ua.find("videolan"):
			self.agent = "VLC"
		elif ua.find("xine"):
			self.agent = "Xine"
		elif ua.find("fstream"):
			self.agent = "Fstream"
		elif ua.find("bass"):
			self.agent = "BASS/XMplay"
		elif ua.find("xion"):
			self.agent = "Xion"
		elif ua.find("itunes"):
			self.agent = "iTunes"
		elif ua.find('muses'):
			self.agent = "Flash Player"
		elif ua.find('windows'):
			self.agent = "Windows Media"
		else:
			self.agent = "Unknown"
	
	def finish(self, chunk = None):
		if self.failed:
			self.set_status(200)
			self.set_header("icecast-auth-user", "1")
		else:
			self.set_status(400)
			# TODO: This should be zero, but for various testing purposes it's 1 for now
			self.set_header("icecast-auth-user", "1")
		log.debug("ldetect", "Finish!")
		super(RequestHandler, self).finish()
			
	def append(self, message):
		log.debug("ldetect", message)
		self.set_header("icecast-auth-message", message)
		self.write(message)

@handle_url("listener_add/(\d+)")		
class AddListener(IcecastHandler):
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
	
	def get(self, sid):
		self.append("Add pass.")
		
	def post(self, sid):
		self.append("Add pass.")
	
	# def get(self, sid):
		# if self.arguments['user'] > 1:
			# self.add_registered(sid)
		# else:
			# self.add_anonymous(sid)
	
	# def add_registered(self, sid):
		# tunedin = db.fetchvar("SELECT COUNT(*) FROM rw_listeners WHERE user_id = %s", (self.user_id,))
		# if tunedin:
			# db.update(
				# "UPDATE rw_listeners "
				# "SET sid = %s, list_purge = FALSE, list_icecast_id = %s, list_relay = %s, list_agent = %s "
				# "WHERE user_id = %s",
				# (sid, self.relay_client_id, self.relay, self.agent, self.user_id))
			# self.icecast(True, "Registered user's record updated.")
		# else:
			# sched_id = globals.cache.get(sid, globals.JSONName.current)['sched_id']
			# active = db.fetchvar("SELECT COUNT(*) FROM rw_votehistory WHERE user_id = %s AND sched_id = %s", (self.user_id, sched_id))
			# if active:
				# active = True
			# else:
				# active = False
			# db.update("INSERT INTO rw_listeners "
				# "(sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id, list_active) "
				# "VALUES (%s, %s, %s, %s, %s, %s, %s)",
				# (sid, self.listener_ip, self.user_id, self.relay, self.agent, self.relay_client_id, active))
			# self.icecast(True, "Registered user is now tuned in.")
		# qcount = db.fetchvar("SELECT COUNT(*) FROM rw_request_queue JOIN rw_songs USING (song_id) WHERE rw_songs.sid = %s AND user_id = %s AND song_available = TRUE", (sid, self.user_id))
		# if qcount > 0:
			# in_line = db.fetchvar("SELECT COUNT(*) FROM rw_requests WHERE user_id = %s AND request_fulfilled_at = 0", (self.user_id,))
			# if in_line == 0:
				# db.update("INSERT INTO rw_requests (sid, user_id) VALUES (%s, %s)", (sid, self.user_id))
			# else:
				# db.update("UPDATE rw_requests SET request_tunedin_expiry = NULL WHERE user_id = %s", (self.user_id,))
		# globals.sendUserSignal(self.user_id)
		
	# def add_anonymous(self, sid):
		# if db.fetchvar("SELECT COUNT(*) FROM rw_listeners WHERE list_ip_address = %s AND list_purge = FALSE", (self.listener_ip,)) == 0:
			# db.update(
				# "INSERT INTO rw_listeners (sid, list_ip_address, user_id, list_relay, list_agent, list_icecast_id) "
				# "VALUES (%s, %s, %s, %s, %s, %s)",
				# (sid, self.listener_ip, 1, self.relay, self.agent, self.relay_client_id))
			# globals.sendUserIPSignal(self.listener_ip)
			# self.icecast(True, "Anonymous user is now tuned in with record.")
		# else:
			# self.icecast(True, "Anonymous user tuned in without record.")
			
@handle_url("listener_remove/(\d+)")
class RemoveListener(IcecastHandler):
	fields = {
		"server": (fieldtypes.string, True),
		"port": (fieldtypes.integer, True),
		"client": (fieldtypes.integer, False),
		"mount": (fieldtypes.string, True),
		"user": (fieldtypes.string, False),
		"pass": (fieldtypes.string, False),
		"ip": (fieldtypes.string, True)
	}
	
	def get(self, sid):
		self.append("Remove pass.")
		
	def post(self, sid):
		self.append("Remove pass.")
		# listener = db.fetchrow("SELECT user_id, list_ip_address FROM rw_listeners WHERE list_icecast_id = %s AND list_relay = %s", (self.relay_client_id, self.relay))
		# if not listener:
			# return self.icecast(True, "No user record to delete.")
		# db.update("UPDATE rw_listeners SET list_purge = TRUE WHERE list_icecast_id = %s AND list_relay = %s", (self.relay_client_id, self.relay))
		# self.icecast(True, "Listener record flagged for removal.")
		# if listener['user_id'] > 1:
			# globals.sendUserSignal(listener['user_id'])
		# else:
			# globals.sendUserIPSignal(listener['list_ip_address'])
