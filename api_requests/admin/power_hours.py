from libs import cache
from libs import db
from libs import config
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
from rainwave.events.event import BaseProducer

@handle_api_url("admin/list_power_hours")
class ListPowerHours(api.web.APIHandler):
	return_name = "power_hours"
	admin_required = True
	sid_required = True

	def post(self):
		self.append(self.return_name,
			db.c.fetch_all("SELECT sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end "
						"FROM r4_schedule "
						"WHERE sched_type = 'OneUpProducer' AND sched_used = FALSE AND sid = %s ORDER BY sched_start",
						(self.sid,)))

@handle_api_url("admin/create_power_hour")
class CreatePowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "name": (fieldtypes.string, True), "utc_time": (fieldtypes.positive_integer, True) }

	def post(self):
		ph = OneUpProducer.create(self.sid, self.get_argument("utc_time"), self.get_argument("utc_time"), self.get_argument("name"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/get_power_hour")
class GetPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def post(self):
		ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		if ph:
			self.append(self.return_name, ph.to_dict())
		else:
			self.append(self.return_name, None)

@handle_api_url("admin/add_song_to_power_hour")
class AddSongToPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "song_id": (fieldtypes.song_id, True), "song_sid": (fieldtypes.sid, True) }

	def post(self):
		ph =  OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		ph.add_song_id(self.get_argument("song_id"), self.get_argument("song_sid"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/add_album_to_power_hour")
class AddAlbumToPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "album_id": (fieldtypes.album_id, True), "album_sid": (fieldtypes.sid, True) }

	def post(self):
		ph =  OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
		ph.add_album_id(self.get_argument("album_id"), self.get_argument("album_sid"))
		self.append(self.return_name, ph.to_dict())

@handle_api_url("admin/remove_from_power_hour")
class RemoveFromPowerHour(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "one_up_id": (fieldtypes.song_id, True) }

	def post(self):
		ph_id = db.c.fetch_var("SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s", (self.get_argument("one_up_id"),))
		if not ph_id:
			raise APIException("invalid_argument", "Invalid One Up ID.")
		ph = OneUpProducer.load_producer_by_id(ph_id)
		ph.remove_one_up(self.get_argument("one_up_id"))
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

@handle_api_url("admin/change_producer_start_time")
class ChangeProducerStartTime(api.web.APIHandler):
	return_name = "producer"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "utc_time": (fieldtypes.positive_integer, True) }

	def post(self):
		producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		producer.change_start(self.get_argument("utc_time"))
		self.append(self.return_name, producer.to_dict())

@handle_api_url("admin/delete_producer")
class DeleteProducer(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "sched_id": (fieldtypes.sched_id, True) }

	def post(self):
		producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		if not producer:
			raise APIException("internal_error", "Producer ID %s not found." % self.get_argument("sched_id"))
		db.c.update("DELETE FROM r4_schedule WHERE sched_id = %s", (self.get_argument("sched_id"),))
		self.append_standard("success", "Producer deleted.")

@handle_api_url("admin/change_producer_name")
class ChangeProducerName(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "sched_id": (fieldtypes.sched_id, True), "name": (fieldtypes.string, True) }

	def post(self):
		producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		if not producer:
			raise APIException("internal_error", "Producer ID %s not found." % self.get_argument("sched_id"))
		db.c.update("UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s", (self.get_argument("name"), self.get_argument("sched_id")))
		self.append_standard("success", "Producer name changed to '%s'." % self.get_argument("name"))