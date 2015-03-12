from libs import cache
import api.web
from api.server import handle_api_url
from api import liquidsoap

@handle_api_url("admin/dj/pause")
class PauseStation(api.web.APIHandler):
	dj_required = True

	def post(self):
		result = liquidsoap.pause(self.sid)
		cache.set_station(self.sid, "backend_paused", True)
		self.append(self.return_name, { "success": True, "message": result })

@handle_api_url("admin/dj/unpause")
class UnpauseStation(api.web.APIHandler):
	dj_required = True

	def post(self):
		result = liquidsoap.unpause(self.sid)
		cache.set_station(self.sid, "backend_paused", False)
		self.append(self.return_name, { "success": True, "message": result })

@handle_api_url("admin/dj/skip")
class SkipStation(api.web.APIHandler):
	dj_required = True

	def post(self):
		result = liquidsoap.skip(self.sid)
		self.append(self.return_name, { "success": True, "message": result })