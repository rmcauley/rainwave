from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestRequest(AsyncHTTPTestCase):
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

    def _first_song_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        album_id = self._payload(response)["all_albums"][0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def test_delete_request_fails_when_missing(self):
        response = self._post(
            "/api4/delete_request",
            self._auth_data(song_id=999999),
            raise_error=False,
        )
        assert response.code == 400
        payload = self._payload(response)
        assert payload["delete_request_result"]["tl_key"] == "invalid_argument"

    def test_request_favorited_fails(self):
        response = self._post(
            "/api4/request_favorited_songs",
            self._auth_data(),
            raise_error=False,
        )
        assert response.code == 200
        payload = self._payload(response)
        assert (
            payload["request_favorited_songs_result"]["tl_key"]
            == "request_favorited_failed"
        )

    def test_clear_requests(self):
        response = self._post("/api4/clear_requests", self._auth_data())
        payload = self._payload(response)
        assert "requests" in payload

    def test_clear_requests_on_cooldown(self):
        response = self._post("/api4/clear_requests_on_cooldown", self._auth_data())
        payload = self._payload(response)
        assert "requests" in payload

    def test_pause_unpause_request_queue(self):
        response = self._post("/api4/pause_request_queue", self._auth_data())
        payload = self._payload(response)
        assert "user" in payload

        response = self._post("/api4/unpause_request_queue", self._auth_data())
        payload = self._payload(response)
        assert "user" in payload

    def test_request_line(self):
        response = self._post("/api4/request_line", self._auth_data())
        payload = self._payload(response)
        assert payload["request_line"] is None or isinstance(
            payload["request_line"], list
        )
