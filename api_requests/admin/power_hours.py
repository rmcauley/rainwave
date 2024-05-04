from time import time as timestamp
from libs import db
import api.web
from api.urls import handle_api_url
from api.exceptions import APIException
from api import fieldtypes

from rainwave.events.oneup import OneUpProducer


@handle_api_url("admin/list_power_hours")
class ListPowerHours(api.web.APIHandler):
    return_name = "power_hours"
    admin_required = True
    sid_required = True

    def post(self):
        self.append(
            self.return_name,
            db.c.fetch_all(
                "SELECT sched_id AS id, sched_name AS name, sched_start AS start, sched_end AS end, sched_url AS url "
                "FROM r4_schedule "
                "WHERE sched_type = 'OneUpProducer' AND sid = %s AND sched_start > %s ORDER BY sched_start ASC",
                (self.sid, timestamp() - (86400 * 26)),
            ),
        )


@handle_api_url("admin/get_power_hour")
class GetPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

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
    allow_sid_zero = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "song_id": (fieldtypes.song_id, True),
        "song_sid": (fieldtypes.sid, True),
    }

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not ph:
            raise APIException("404", http_code=404)
        ph.add_song_id(self.get_argument("song_id"), self.get_argument("song_sid"))
        self.append(self.return_name, ph.to_dict())


@handle_api_url("admin/add_album_to_power_hour")
class AddAlbumToPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    allow_sid_zero = True
    fields = {
        "sched_id": (fieldtypes.sched_id, True),
        "album_id": (fieldtypes.album_id, True),
        "album_sid": (fieldtypes.sid, True),
    }

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not ph:
            raise APIException("404", http_code=404)
        ph.add_album_id(self.get_argument("album_id"), self.get_argument("album_sid"))
        self.append(self.return_name, ph.to_dict())


@handle_api_url("admin/remove_from_power_hour")
class RemoveFromPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"one_up_id": (fieldtypes.positive_integer, True)}

    def post(self):
        ph_id = db.c.fetch_var(
            "SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s",
            (self.get_argument("one_up_id"),),
        )
        if not ph_id:
            raise APIException("invalid_argument", "Invalid One Up ID.")
        ph = OneUpProducer.load_producer_by_id(ph_id)
        if not ph:
            raise APIException("404", http_code=404)
        ph.remove_one_up(self.get_argument("one_up_id"))
        self.append(self.return_name, ph.to_dict())


@handle_api_url("admin/shuffle_power_hour")
class ShufflePowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"sched_id": (fieldtypes.sched_id, True)}

    def post(self):
        ph = OneUpProducer.load_producer_by_id(self.get_argument("sched_id"))
        if not ph:
            raise APIException("404", http_code=404)
        ph.shuffle_songs()
        self.append(self.return_name, ph.to_dict())


@handle_api_url("admin/move_up_in_power_hour")
class MoveUpInPowerHour(api.web.APIHandler):
    return_name = "power_hour"
    admin_required = True
    sid_required = True
    fields = {"one_up_id": (fieldtypes.positive_integer, True)}

    def post(self):
        ph_id = db.c.fetch_var(
            "SELECT sched_id FROM r4_one_ups WHERE one_up_id = %s",
            (self.get_argument("one_up_id"),),
        )
        if not ph_id:
            raise APIException("invalid_argument", "Invalid One Up ID.")
        ph = OneUpProducer.load_producer_by_id(ph_id)
        if not ph:
            raise APIException("404", http_code=404)
        ph.move_song_up(self.get_argument("one_up_id"))
        self.append(self.return_name, ph.to_dict())
