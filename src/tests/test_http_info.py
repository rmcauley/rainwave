import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from web_api.urls import request_classes
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestInfo(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data, raise_error=True):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            raise_error=raise_error,
        )
        return response

    def _payload(self, response):
        return json.loads(response.body.decode("utf-8"))

    def _auth_data(self, **extra):
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
        data.update(extra)
        return data

    def _anon_auth_data(self, **extra):
        return self._auth_data(
            user_id=ANONYMOUS_USER_ID, key=ANONYMOUS_API_KEY, **extra
        )

    def test_info_all_returns_station_info(self):
        response = self._post("/api4/info_all", self._auth_data())
        payload = self._payload(response)
        assert "all_stations_info" in payload
        assert "1" in payload["all_stations_info"]

    def test_info_all_returns_station_info_anonymous(self):
        response = self._post("/api4/info_all", self._anon_auth_data())
        payload = self._payload(response)
        assert "all_stations_info" in payload
        assert "1" in payload["all_stations_info"]

    def test_stations_returns_list(self):
        response = self._post("/api4/stations", self._auth_data())
        payload = self._payload(response)
        stations = payload["stations"]
        assert isinstance(stations, list)
        assert len(stations) == 1
        assert {"id", "name", "description", "stream", "relays", "key"}.issubset(
            stations[0].keys()
        )
