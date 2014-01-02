from libs import cache
from libs import db
import api.web
from api.server import handle_api_url
from api.server import handle_url
from api.exceptions import APIException
from api import fieldtypes
from api_requests.admin.dj_election import GetCachedSongList
from api_requests.admin.dj_election import AddToCachedSongList
from api_requests.admin.dj_election import RemoveFromCachedSongList

from rainwave.events.oneup import OneUpProducer
from rainwave.events.oneup import OneUp

@handle_api_url("admin/create_power_hour")
class CreatePowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "name": (fieldtypes.string, True), "time": (fieldtypes.positive_integer, True) }

	def post(self):
		ph = OneUpProducer.create(self.sid, self.get_argument("time"), self.get_argument("time"), self.get_argument("name"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/get_wip_power_hour")
class GetPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def post(self):
		self.append(self.return_name, OneUpProducer.load_producer_by_id(self.get_argument("sched_id")).to_dict())

@handle_api_url("admin/add_to_power_hour")
class AddToPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "song_id": (fieldtypes.song_id, True) }

	def post(self):
		ph =  OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		ph.add_song_id(self.get_argument("song_id"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/remove_from_power_hour")
class RemoveFromPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "song_id": (fieldtypes.song_id, True) }

	def post(self):
		ph =  OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		ph.remove_song_id(self.get_argument("song_id"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/shuffle_power_hour")
class ShufflePowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def post(self):
		ph =  OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		ph.shuffle_songs()
		self.append(self.return_name, ph.to_dict())
