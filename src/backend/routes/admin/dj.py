import random
import string
from time import time as timestamp

from libs import cache

import api_web.web
from api_web.exceptions import APIException
from api_web.urls import handle_api_url
from api_web import liquidsoap
from api_web import fieldtypes
from routes.info import attach_dj_info_to_request


@handle_api_url("admin/dj/pause")
class PauseStation(api_web.web.APIHandler):
    dj_required = True

    def post(self):
        cache.set_station(self.sid, "backend_paused", True)
        attach_dj_info_to_request(self)
        self.append(
            self.return_name,
            {
                "success": True,
                "message": "At 0:00 the station will go silent and wait for you.",
            },
        )


@handle_api_url("admin/dj/unpause")
class UnpauseStation(api_web.web.APIHandler):
    dj_required = True
    fields = {"kick_dj": (fieldtypes.boolean, False)}

    def post(self):
        if not cache.get_station(self.sid, "backend_paused"):
            result = "Station seems unpaused already.  "
        else:
            result = "Unpausing station.  "
        cache.set_station(self.sid, "backend_paused", False)
        if cache.get_station(self.sid, "backend_paused_playing"):
            result += "Automatically starting music.  "
            result += "\n"
            result += liquidsoap.skip(self.sid)
        else:
            result += "If station remains silent, music will start playing within 5 minutes unless you hit skip."
        if self.get_argument("kick_dj", default=False):
            result += "Kicking DJ.  "
            result += "\n"
            result += liquidsoap.kick_dj(self.sid)
        attach_dj_info_to_request(self)
        self.append(self.return_name, {"success": True, "message": result})


@handle_api_url("admin/dj/skip")
class SkipStation(api_web.web.APIHandler):
    dj_required = True

    def post(self):
        result = liquidsoap.skip(self.sid)
        attach_dj_info_to_request(self)
        self.append(self.return_name, {"success": True, "message": result})


@handle_api_url("admin/dj/pause_title")
class PauseTitle(api_web.web.APIHandler):
    dj_required = True
    fields = {"title": (fieldtypes.string, True)}

    def post(self):
        cache.set_station(self.sid, "pause_title", self.get_argument("title"))
        attach_dj_info_to_request(self)
        self.append(
            self.return_name,
            {"success": True, "pause_title": self.get_argument("title")},
        )


@handle_api_url("admin/dj/change_pw")
class ChangeDJPW(api_web.web.APIHandler):
    dj_required = True

    def post(self):
        new_pw = "".join(
            random.SystemRandom().choice(string.ascii_uppercase + string.digits)
            for x in range(10)
        )
        result = liquidsoap.set_password(self.sid, new_pw)
        if result.startswith("Variable harbor_pw set (was"):
            cache.set_station(self.sid, "dj_password", new_pw, save_local=True)
            attach_dj_info_to_request(self)
        else:
            raise APIException("internal_error", "Internal error changing DJ key.")


@handle_api_url("admin/dj/heartbeat")
class DJHeartbeat(api_web.web.APIHandler):
    dj_required = True

    def post(self):
        cache.set_station(self.sid, "dj_heartbeat", timestamp())
        self.append(self.return_name, {"success": True})
