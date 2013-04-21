import re

from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
import api.returns

from libs import cache
from libs import log
from libs import db
from rainwave import user
from backend import sync_to_front

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
		self.user = None
		
		self.relay = fieldtypes.valid_relay(self.request.remote_ip)
		
		if not self.relay:
			self.set_status(403)
			self.append("%s is not a valid relay." % self.request.remote_ip)
			self.finish()
			return
		super(RequestHandler, self).prepare()
		
		if self.get_argument("mount"):
			m = re.search(r"^/(?P<mount>[\d\w\-.]+)(\?(?P<user>\d+):(?P<key>[\d\w]+))?(?:\?\d+\.(?:mp3|ogg))?$", self.get_argument("mount"))
			if m:
				rd = m.groupdict()
				self.mount = rd["mount"]
				if "user" in rd and rd["user"]:
					self.user_id = long(rd["user"])
					self.listen_key = rd["key"]
				else:
					self.user_id = 1
		
		if self.get_argument("agent"):	
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
			self.set_status(403)
			self.set_header("icecast-auth-user", "0")
		else:
			self.set_status(200)
			self.set_header("icecast-auth-user", "1")
		log.debug("ldetect", "Finish!")
		super(RequestHandler, self).finish()
			
	def append(self, message):
		log.debug("ldetect", message)
		self.set_header("icecast-auth-message", message)
		self.write(message)

@handle_api_url("listener_add/(\d+)")		
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
		
	def post(self, sid):
		sid = 1
		if self.user_id > 1:
			self.add_registered(int(sid))
		else:
			self.add_anonymous(int(sid))
	
	def add_registered(self, sid):
		tunedin = db.c.fetch_var("SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s", (self.user_id,))
		if tunedin:
			db.c.update(
				"UPDATE r4_listeners "
				"SET sid = %s, listener_ip = s, listener_purge = FALSE, listener_icecast_id = %s, listener_relay = %s, listener_agent = %s "
				"WHERE user_id = %s",
				(sid, self.get_argument("ip"), self.get_argument("client"), self.relay, self.agent, self.user_id))
			self.append("Registered user %s record updated." % self.user_id)
			self.failed = False
		else:
			db.c.update("INSERT INTO r4_listeners "
				"(sid, user_id, listener_ip, listener_icecast_id, listener_relay, listener_agent) "
				"VALUES (%s, %s, %s, %s, %s, %s)",
				(sid, self.user_id, self.listener_ip, self.relay, self.agent, self.get_argument("client")))
			self.append(True, "Registered user %s is now tuned in." % self.user_id)
			self.failed = False
		if not self.failed:
			u = user.User(self.user_id)
			if u.has_requests() and not u.is_in_request_line():
				u.put_in_request_line(sid)
		sync_to_front.sync_frontend_user_id(self.user_id)
		
	def add_anonymous(self, sid):
		# Here we'll erase any extra records for the same IP address (shouldn't happen but you never know, especially
		# if the system gets a reset).  There is a small flaw here; there's a chance we'll pull in 2 clients with the same client ID.
		# I (rmcauley) am classifying this as "collatoral damage" - an anon user who is actively using the website
		# can re-tune-in on the small chance that this occurs.
		records = db.c.fetch_list("SELECT listener_icecast_id FROM r4_listeners WHERE listener_ip = %s", (self.get_argument("ip"),))
		if len(records) == 0:
			db.c.update("INSERT INTO r4_listeners "
					"(sid, listener_ip, user_id, listener_relay, listener_agent, listener_icecast_id) "
					"VALUES (%s, %s, %s, %s, %s, %s)",
				(sid, self.get_argument("ip"), 1, self.relay, self.get_argument("agent"), self.get_argument("client")))
			sync_to_front.sync_frontend_ip(self.get_argument("ip"))
			self.append("Anonymous user from IP %s is now tuned in with record." % self.get_argument("ip_address"))
			self.failed = False
		else:
			while len(records) > 1:
				extra_record = records.pop()
				db.c.update("DELETE FROM r4_listeners WHERE listener_icecast_id = %s", (records.pop(),))
				log.debug("ldetect", "Deleted extra record for icecast ID %s from IP %s." % (self.get_argument("client"), self.get_argument("ip")))
			db.c.update("UPDATE r4_listeners SET listener_icecast_id = %s, listener_purge = FALSE WHERE listener_ip = %s", (self.get_argument("client"), self.get_argument("ip")))
			self.append("Anonymous user from IP %s record updated." % self.get_argument("ip"))
			self.failed = False
			
@handle_api_url("listener_remove")
class RemoveListener(IcecastHandler):
	fields = {
		"client": (fieldtypes.integer, True),
	}

	def post(self):
		listener = db.c.fetchrow("SELECT user_id, listener_ip FROM r4_listeners WHERE listener_icecast_id = %s AND list_relay = %s",
								 (self.get_argument("relay"), self.get_argument("client")))
		if not listener:
			return self.append("No user record to delete for client %s on relay %s." % (self.get_argument("relay"), self.get_argument("client")))

		db.c.update("UPDATE r4_listeners SET listener_purge = TRUE WHERE listener_icecast_id = %s AND listener_relay = %s", (self.get_argument("relay"), self.get_argument("client")))
		self.append("User ID %s relay %s flagged for removal." % (self.get_argument("relay"), self.get_argument("client")))
		if listener['user_id'] > 1:
			sync_to_front.sync_frontend_user_id(listener['user_id'])
		else:
			sync_to_front.sync_frontend_ip(listener['listener_ip'])
		self.failed = False
