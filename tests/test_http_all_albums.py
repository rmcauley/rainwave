from __future__ import annotations

import json

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestAllAlbums(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def test_all_albums_returns_list(self):
        body = "user_id=2&key=TESTKEY&sid=1"
        response = self.fetch(
            "/api4/all_albums",
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        print(json.loads(response.body.decode("utf-8")))
        assert response.code == 200
        payload = json.loads(response.body.decode("utf-8"))
        assert "all_albums" in payload
        assert isinstance(payload["all_albums"], list)
        assert len(payload["all_albums"]) == 100
