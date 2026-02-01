from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


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
        data = {"user_id": 2, "key": "TESTKEY", "sid": 1}
        data.update(extra)
        return data

    def test_info_returns_server_just_started(self):
        response = self._post("/api4/info", self._auth_data(), raise_error=False)
        assert response.code == 500
        payload = self._payload(response)
        assert payload["info_result"]["tl_key"] == "server_just_started"

    def test_info_all_returns_station_info(self):
        response = self._post("/api4/info_all", self._auth_data())
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
