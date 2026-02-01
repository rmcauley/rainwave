from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestTipJar(AsyncHTTPTestCase):
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

    def test_tip_jar_empty(self):
        response = self._post("/api4/tip_jar", {})
        payload = json.loads(response.body.decode("utf-8"))
        assert payload["tip_jar"] == []
