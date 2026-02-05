import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from web_api.urls import request_classes


class TestPowerHours(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        return response

    def test_power_hours_empty(self):
        response = self._post("/api4/power_hours", {})
        payload = json.loads(response.body.decode("utf-8"))
        assert payload["power_hours"] == []
