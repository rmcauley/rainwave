from datetime import datetime, timedelta
from pytz import timezone
from time import time as timestamp
from src.backend.libs import db
import web_api.web
from web_api.urls import handle_api_url
from web_api.exceptions import APIException
from web_api import fieldtypes
from src.backend.rainwave.events import event
from src.backend.rainwave.events.event import BaseProducer


@handle_api_url("admin/list_producers")
class ListProducers(web_api.web.APIHandler):
    return_name = "producers"
    admin_required = True
    sid_required = True

    def post(self):
        self.append(
            self.return_name,
            db.c.fetch_all(
                "SELECT sched_type as type, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url, sid, ROUND((sched_end - sched_start) / 60) AS sched_length_minutes, COALESCE(radio_username, username) AS username "
                "FROM r4_schedule LEFT JOIN phpbb_users ON (sched_dj_user_id = user_id) "
                "WHERE sched_used = FALSE AND sid = %s AND sched_start >= %s ORDER BY sched_start",
                (self.sid, timestamp()),
            ),
        )

        self.append(
            self.return_name + "_past",
            db.c.fetch_all(
                "SELECT sched_type as type, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url, sid, ROUND((sched_end - sched_start) / 60) AS sched_length_minutes, COALESCE(radio_username, username) AS username "
                "FROM r4_schedule LEFT JOIN phpbb_users ON (sched_dj_user_id = user_id) "
                "WHERE sched_type != 'PVPElectionProducer' AND sid = %s AND sched_start > %s AND sched_start < %s ORDER BY sched_start DESC",
                (self.sid, timestamp() - (86400 * 60), timestamp()),
            ),
        )


@handle_api_url("admin/list_producers_all")
class ListProducersAll(web_api.web.APIHandler):
    return_name = "producers"
    admin_required = True
    sid_required = False

    def post(self):
        self.append(
            self.return_name,
            db.c.fetch_all(
                "SELECT sched_type as type, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url, sid, ROUND((sched_end - sched_start) / 60) AS sched_length_minutes, COALESCE(radio_username, username) AS username "
                "FROM r4_schedule LEFT JOIN phpbb_users ON (sched_dj_user_id = user_id)  "
                "WHERE sched_used = FALSE AND sched_start >= %s ORDER BY sched_start",
                (timestamp(),),
            ),
        )

        self.append(
            self.return_name + "_past",
            db.c.fetch_all(
                "SELECT sched_type as type, sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url, sid, ROUND((sched_end - sched_start) / 60) AS sched_length_minutes, COALESCE(radio_username, username) AS username "
                "FROM r4_schedule LEFT JOIN phpbb_users ON (sched_dj_user_id = user_id)  "
                "WHERE sched_type != 'PVPElectionProducer' AND sched_start > %s AND sched_start < %s ORDER BY sched_start DESC",
                (timestamp() - (86400 * 26), timestamp()),
            ),
        )


@handle_api_url("admin/list_producer_types")
class ListProducerTypes(web_api.web.APIHandler):
    return_name = "producer_types"
    admin_required = True
    sid_required = False

    def post(self):
        self.append(self.return_name, event.get_admin_creatable_producers())


@handle_api_url("admin/create_producer")
class CreateProducer(web_api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {
        "producer_type": (fieldtypes.producer_type, True),
        "name": (fieldtypes.string, True),
        "start_utc_time": (fieldtypes.positive_integer, True),
        "end_utc_time": (fieldtypes.positive_integer, True),
        "url": (fieldtypes.string, None),
        "fill_unrated": (fieldtypes.boolean, False),
    }

    def post(self):
        p = event.all_producers[self.get_argument("producer_type")].create(
            sid=self.sid,
            start=self.get_argument("start_utc_time"),
            end=self.get_argument("end_utc_time"),
            name=self.get_argument("name"),
            url=self.get_argument("url"),
        )
        if self.get_argument("fill_unrated") and getattr(p, "fill_unrated", False):
            end_time = self.get_argument_int("end_utc_time")
            start_time = self.get_argument_int("start_utc_time")
            if not end_time or not start_time:
                raise APIException(400, http_code=400)
            p.fill_unrated(
                self.sid,
                end_time - start_time,
            )
        self.append(self.return_name, p.to_dict())


@handle_api_url("admin/duplicate_producer")
class DuplicateProducer(web_api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        new_producer = producer.duplicate()
        self.append(self.return_name, new_producer.to_dict())


@handle_api_url("admin/europify_producer")
class EuropifyProducer(web_api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        new_producer = producer.duplicate()
        new_producer.name += " Reprisal"
        start_eu = datetime.fromtimestamp(producer.start, timezone("UTC")).replace(
            tzinfo=timezone("Europe/London")
        ).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
        start_epoch_eu = int(
            (start_eu - datetime.fromtimestamp(0, timezone("UTC"))).total_seconds()
        )
        new_producer.change_start(start_epoch_eu)
        db.c.update(
            "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
            (new_producer.name, new_producer.id),
        )
        self.append(self.return_name, new_producer.to_dict())


@handle_api_url("admin/change_producer_name")
class ChangeProducerName(web_api.web.APIHandler):
    admin_required = True
    sid_required = False
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "name": (fieldtypes.string, True),
    }

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        db.c.update(
            "UPDATE r4_schedule SET sched_name = %s WHERE sched_id = %s",
            (self.get_argument("name"), self.get_argument("sched_id")),
        )
        self.append_standard(
            "success", "Producer name changed to '%s'." % self.get_argument("name")
        )


@handle_api_url("admin/change_producer_url")
class ChangeProducerURL(web_api.web.APIHandler):
    admin_required = True
    sid_required = False
    fields = {"sched_id": (fieldtypes.sched_id, True), "url": (fieldtypes.string, None)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        db.c.update(
            "UPDATE r4_schedule SET sched_url = %s WHERE sched_id = %s",
            (self.get_argument("url"), self.get_argument("sched_id")),
        )
        if self.get_argument("url"):
            self.append_standard(
                "success", "Producer URL changed to '%s'." % self.get_argument("url")
            )
        else:
            self.append_standard("success", "Producer URL removed.")


@handle_api_url("admin/change_producer_start_time")
class ChangeProducerStartTime(web_api.web.APIHandler):
    return_name = "producer"
    admin_required = True
    sid_required = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "utc_time": (fieldtypes.positive_integer, True),
    }

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException("404", http_code=404)
        producer.change_start(self.get_argument("utc_time"))
        self.append(self.return_name, producer.to_dict())


@handle_api_url("admin/change_producer_end_time")
class ChangeProducerEndTime(web_api.web.APIHandler):
    return_name = "producer"
    admin_required = True
    sid_required = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "utc_time": (fieldtypes.positive_integer, True),
    }

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException("404", http_code=404)
        producer.change_end(self.get_argument("utc_time"))
        self.append(self.return_name, producer.to_dict())


@handle_api_url("admin/delete_producer")
class DeleteProducer(web_api.web.APIHandler):
    admin_required = True
    sid_required = False
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        producer = BaseProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not producer:
            raise APIException(
                "internal_error",
                "Producer ID %s not found." % self.get_argument("sched_id"),
            )
        db.c.update(
            "DELETE FROM r4_schedule WHERE sched_id = %s",
            (self.get_argument("sched_id"),),
        )
        self.append_standard("success", "Producer deleted.")
