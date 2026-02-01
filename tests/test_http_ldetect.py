from __future__ import annotations

from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestListenerDetect(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            raise_error=False,
        )
        return response

    def test_listener_add_anonymous_no_listen_key(self):
        response = self._post(
            "/api4/listener_add/1",
            {
                "client": 1,
                "mount": "/station.mp3",
                "ip": "127.0.0.1",
                "agent": "VLC",
            },
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"

    def test_listener_add_and_remove_with_listen_key(self):
        response = self._post(
            "/api4/listener_add/1",
            {
                "client": 2,
                "mount": "/station.mp3?1:aaaaaaaaaa&127.0.0.1",
                "ip": "127.0.0.1",
                "agent": "VLC",
            },
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"

        response = self._post(
            "/api4/listener_remove",
            {
                "client": 2,
            },
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"
