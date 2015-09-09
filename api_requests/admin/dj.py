from libs import cache
import api.web
from api.server import handle_api_url
from api import liquidsoap
from api import fieldtypes

@handle_api_url("admin/dj/pause")
class PauseStation(api.web.APIHandler):
	dj_required = True

	def post(self):
		cache.set_station(self.sid, "backend_paused", True)
		cache.set_station(self.sid, "backend_pause_extend", True)
		self.append(self.return_name, { "success": True, "message": "At 0:00 the station will go silent and wait for you." })

@handle_api_url("admin/dj/unpause")
class UnpauseStation(api.web.APIHandler):
	dj_required = True
	fields = { "kick_dj": (fieldtypes.boolean, False) }

	def post(self):
		if not cache.get_station(self.sid, "backend_paused"):
			result = "Station seems unpaused already.  "
		else:
			result = "Unpausing station.  "
		cache.set_station(self.sid, "backend_paused", False)
		cache.set_station(self.sid, "backend_pause_extend", False)
		if (cache.get_station(self.sid, "backend_paused_playing")):
			result += "Automatically starting music.  "
			result += "\n"
			result += liquidsoap.skip(self.sid)
		else:
			result += "If station remains silent, music will start playing within 5 minutes unless you hit skip."
		if (self.get_argument("kick_dj", default=False)):
				result += "Kicking DJ.  "
				result += "\n"
				result += liquidsoap.kick_dj(self.sid)
		self.append(self.return_name, { "success": True, "message": result })

@handle_api_url("admin/dj/skip")
class SkipStation(api.web.APIHandler):
	dj_required = True

	def post(self):
		result = liquidsoap.skip(self.sid)
		self.append(self.return_name, { "success": True, "message": result })

@handle_api_url("admin/dj/pause_title")
class PauseTitle(api.web.APIHandler):
	dj_required = True
	fields = { "title": (fieldtypes.string, True) }

	def post(self):
		cache.set_station(self.sid, "pause_title", self.get_argument("title"))
		self.append(self.return_name, { "success": True, "pause_title": self.get_argument("title") })