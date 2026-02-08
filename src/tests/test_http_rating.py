import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
import pytest
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_DONOR_API_KEY,
    TUNED_OUT_DONOR_USER_ID,
    TUNED_OUT_LOGGED_IN_API_KEY,
    TUNED_OUT_LOGGED_IN_USER_ID,
)


class TestRating(AsyncHTTPTestCase):
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

    def _current_song_id(self, auth_data):
        response = self._post("/api4/info", auth_data)
        payload = self._payload(response)
        sched_current = payload.get("sched_current") or {}
        songs = sched_current.get("songs") or []
        if not songs:
            pytest.skip("No current song available for rating tests.")
        return songs[0]["id"]

    def _first_song_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        album_id = self._payload(response)["all_albums"][0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def test_rate_requires_login(self):
        song_id = self._first_song_id()
        response = self._post(
            "/api4/rate",
            self._anon_auth_data(song_id=song_id, rating=4.0),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["rate_result"]["tl_key"] == "login_required"

    def test_rate_allows_donor_when_tuned_out(self):
        auth_data = self._auth_data(
            user_id=TUNED_OUT_DONOR_USER_ID,
            key=TUNED_OUT_DONOR_API_KEY,
        )
        song_id = self._current_song_id(auth_data)
        response = self._post(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 4.5},
        )
        payload = self._payload(response)
        assert payload["rate_result"]["success"] is True

        payload = self._payload(self._post("/api4/info", auth_data))
        sched_current = payload.get("sched_current") or {}
        songs = sched_current.get("songs") or []
        assert songs
        assert songs[0]["id"] == song_id
        assert songs[0]["rating_user"] == 4.5

    def test_rate_allows_tuned_in_user(self):
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )
        song_id = self._current_song_id(auth_data)
        response = self._post(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 3.5},
        )
        payload = self._payload(response)
        assert payload["rate_result"]["success"] is True

    def test_rate_rejects_tuned_out_user(self):
        auth_data = self._auth_data(
            user_id=TUNED_OUT_LOGGED_IN_USER_ID,
            key=TUNED_OUT_LOGGED_IN_API_KEY,
        )
        song_id = self._current_song_id(auth_data)
        response = self._post(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 2.5},
            raise_error=False,
        )
        payload = self._payload(response)
        assert payload["rate_result"]["tl_key"] == "tunein_to_rate_current_song"
