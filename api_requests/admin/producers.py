import time
from libs import db
import api.web
from api.server import handle_api_url
from api.exceptions import APIException
from api import fieldtypes
from rainwave.events import event
from rainwave.events.event import BaseProducer

@handle_api_url("admin/list_producers")
class ListProducers(api.web.APIHandler):
	return_name = "producers"
	admin_required = True
	sid_required = True

	def post(self):
		self.append(self.return_name,
			db.c.fetch_all("SELECT sched_type as type, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url, sid, ROUND((sched_end - sched_start) / 60) AS sched_length_minutes "
						"FROM r4_schedule "
						"WHERE sched_used = FALSE AND sid = %s AND sched_start > %s ORDER BY sched_start DESC",
						(self.sid, time.time() - (86400 * 26))))

@handle_api_url("admin/list_producer_types")
class ListProducerTypes(api.web.APIHandler):
	return_name = "producer_types"
	admin_required = True
	sid_required = False

	def post(self):
		self.append(self.return_name, event.get_admin_creatable_producers())

@handle_api_url("admin/create_producer")
class CreateProducer(api.web.APIHandler):
	return_name = "power_hour"
	admin_required = True
	sid_required = True
	fields = { "producer_type": (fieldtypes.producer_type, True), "name": (fieldtypes.string, True), "start_utc_time": (fieldtypes.positive_integer, True), "end_utc_time": (fieldtypes.positive_integer, True), "url": (fieldtypes.string, None) }

	def post(self):
		p = event.all_producers[self.get_argument("producer_type")].create(sid=self.sid, start=self.get_argument("start_utc_time"), end=self.get_argument("end_utc_time"), name=self.get_argument("name"), url=self.get_argument("url"))
		self.append(self.return_name, p.to_dict())

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

@handle_api_url("admin/change_producer_url")
class ChangeProducerURL(api.web.APIHandler):
	admin_required = True
	sid_required = False
	fields = { "sched_id": (fieldtypes.sched_id, True), "url": (fieldtypes.string, None) }

	def post(self):
		producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		if not producer:
			raise APIException("internal_error", "Producer ID %s not found." % self.get_argument("sched_id"))
		db.c.update("UPDATE r4_schedule SET sched_url = %s WHERE sched_id = %s", (self.get_argument("url"), self.get_argument("sched_id")))
		if self.get_argument("url"):
			self.append_standard("success", "Producer URL changed to '%s'." % self.get_argument("url"))
		else:
			self.append_standard("success", "Producer URL removed.")

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

@handle_api_url("admin/change_producer_end_time")
class ChangeProducerEndTime(api.web.APIHandler):
	return_name = "producer"
	admin_required = True
	sid_required = True
	fields = { "sched_id": (fieldtypes.sched_id, True), "utc_time": (fieldtypes.positive_integer, True) }

	def post(self):
		producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
		producer.change_end(self.get_argument("utc_time"))
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