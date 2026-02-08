import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


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

    def _anon_auth_data(self, **extra):
        return self._auth_data(
            user_id=ANONYMOUS_USER_ID, key=ANONYMOUS_API_KEY, **extra
        )

    def _first_song_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        album_id = self._payload(response)["all_albums"][0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def test_delete_request_fails_when_missing(self):
        response = self._post(
            "/api4/delete_request",
            self._auth_data(song_id=5),
            raise_error=False,
        )
        payload = self._payload(response)
        print(payload)
        assert response.code == 200
        assert payload["delete_request_result"]["tl_key"] == "song_not_requested"

        response = self._post(
            "/api4/delete_request",
            self._anon_auth_data(song_id=5),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["delete_request_result"]["tl_key"] == "login_required"

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

        response = self._post(
            "/api4/request_favorited_songs",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["request_favorited_songs_result"]["tl_key"] == "login_required"

    def test_clear_requests(self):
        response = self._post("/api4/clear_requests", self._auth_data())
        payload = self._payload(response)
        assert "requests" in payload

        response = self._post(
            "/api4/clear_requests",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["clear_requests_result"]["tl_key"] == "login_required"

    def test_clear_requests_on_cooldown(self):
        response = self._post("/api4/clear_requests_on_cooldown", self._auth_data())
        payload = self._payload(response)
        assert "requests" in payload

        response = self._post(
            "/api4/clear_requests_on_cooldown",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert (
            payload["clear_requests_on_cooldown_result"]["tl_key"] == "login_required"
        )

    def test_pause_unpause_request_queue(self):
        response = self._post("/api4/pause_request_queue", self._auth_data())
        payload = self._payload(response)
        assert "user" in payload

        response = self._post("/api4/unpause_request_queue", self._auth_data())
        payload = self._payload(response)
        assert "user" in payload

        response = self._post(
            "/api4/pause_request_queue",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["pause_request_queue_result"]["tl_key"] == "login_required"

        response = self._post(
            "/api4/unpause_request_queue",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["unpause_request_queue_result"]["tl_key"] == "login_required"

    def test_request_line(self):
        response = self._post("/api4/request_line", self._auth_data())
        payload = self._payload(response)
        assert payload["request_line"] is None or isinstance(
            payload["request_line"], list
        )
