from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestListener(AsyncHTTPTestCase):
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

    def test_listener_detail(self):
        response = self._post("/api4/listener", self._auth_data(id=2))
        payload = self._payload(response)
        listener = payload["listener"]
        assert listener["user_id"] == 2
        assert "top_albums" in listener
        assert "rating_spread" in listener

    def test_current_listeners(self):
        response = self._post("/api4/current_listeners", self._auth_data())
        payload = self._payload(response)
        listeners = payload.get("current_listeners")
        assert listeners is None or isinstance(listeners, list)

    def test_user_info(self):
        response = self._post("/api4/user_info", self._auth_data())
        payload = self._payload(response)
        assert payload["user_info"]["id"] == 2
