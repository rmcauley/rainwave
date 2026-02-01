from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestErrorReport(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data, headers=None):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers=headers or {"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.code == 200
        return response

    def test_error_report_accepts_localhost_referer(self):
        data = {
            "user_id": 2,
            "key": "TESTKEY",
            "name": "TestError",
            "message": "Something went wrong",
            "stack": "stack trace",
            "location": "http://localhost/",
            "user_agent": "pytest",
            "browser_language": "en-US",
        }
        response = self._post(
            "/api4/error_report",
            data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "http://localhost/",
            },
        )
        payload = json.loads(response.body.decode("utf-8"))
        assert payload["error_report_result"]["success"] is True
