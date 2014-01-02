import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes

@handle_api_url("admin/get_one_ups")
class GetOneUps(api.web.APIHandler):
	admin_required = True
	description = "Lists all unused OneUps."

	def post(self):
		one_ups = []
		for sched_id in db.c.fetch_list("SELECT r4_schedule.sched_id FROM r4_schedule WHERE sid = %s AND sched_used = FALSE ORDER BY sched_start, sched_id", (self.sid,)):
			one_ups.append(event.load_by_id(sched_id).to_dict(self.user))
		self.append("one_ups", one_ups)

@handle_api_url("admin/add_one_up")
class AddOneUp(api.web.APIHandler):
	admin_required = True
	fields = { "song_id": (fieldtypes.song_id, True) }
	description = "Adds a OneUp to the schedule."

	def post(self):
		e = event.OneUp.create(self.sid, 0, self.get_argument("song_id"))
		self.append(self.return_name, { "success": True, "sched_id": e.id, "text": "OneUp Added" })
		sync_to_back.refresh_schedule(self.sid)

@handle_api_url("admin/delete_one_up")
class DeleteOneUp(api.web.APIHandler):
	admin_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }
	description = "Deletes a OneUp from the schedule. (regardless of whether it's used or not)"

	def post(self):
		e = event.OneUp.load_by_id(self.get_argument("sched_id"))
		if e.used:
			raise Exception("OneUp already used.")
		r = db.c.update("DELETE FROM r4_schedule WHERE sched_id = %s", (e.id,))
		if r:
			self.append(self.return_name, { "success": True, "text": "OneUp deleted." })
			sync_to_back.refresh_schedule(self.sid)
		else:
			self.append(self.return_name, { "success": False, "text": "OneUp not deleted." })
