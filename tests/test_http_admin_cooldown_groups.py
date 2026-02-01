from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from libs import db
import pytest
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestAdminCooldownGroups(AsyncHTTPTestCase):
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

    def _first_album_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        return self._payload(response)["all_albums"][0]["id"]

    def _first_song_id(self):
        album_id = self._first_album_id()
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def _first_group_id(self):
        response = self._post("/api4/all_groups", self._auth_data())
        return self._payload(response)["all_groups"][0]["id"]

    def test_song_cooldown_update_and_reset(self):
        song_id = self._first_song_id()
        override = 1200
        response = self._post(
            "/api4/admin/set_song_cooldown",
            self._auth_data(song_id=song_id, multiply=1.1, override=override),
        )
        payload = self._payload(response)
        assert payload["set_song_cooldown_result"]["success"] is True

        row = db.c.fetch_row(
            "SELECT song_cool_multiply, song_cool_override FROM r4_songs WHERE song_id = %s",
            (song_id,),
        )
        assert row is not None
        assert row["song_cool_multiply"] == pytest.approx(1.1)
        assert row["song_cool_override"] == override

        response = self._post(
            "/api4/admin/reset_song_cooldown",
            self._auth_data(song_id=song_id),
        )
        payload = self._payload(response)
        assert payload["reset_song_cooldown_result"]["success"] is True

        row = db.c.fetch_row(
            "SELECT song_cool_multiply, song_cool_override FROM r4_songs WHERE song_id = %s",
            (song_id,),
        )
        assert row is not None
        assert row["song_cool_multiply"] == pytest.approx(1.0)
        assert row["song_cool_override"] is None

    def test_album_cooldown_update_and_reset(self):
        album_id = self._first_album_id()
        override = 1800
        response = self._post(
            "/api4/admin/set_album_cooldown",
            self._auth_data(album_id=album_id, multiply=1.2, override=override),
        )
        payload = self._payload(response)
        assert payload["set_album_cooldown_result"]["success"] is True

        row = db.c.fetch_row(
            "SELECT album_cool_multiply, album_cool_override FROM r4_album_sid WHERE album_id = %s AND sid = %s",
            (album_id, 1),
        )
        assert row is not None
        assert row["album_cool_multiply"] == pytest.approx(1.2)
        assert row["album_cool_override"] == override

        response = self._post(
            "/api4/admin/reset_album_cooldown",
            self._auth_data(album_id=album_id),
        )
        payload = self._payload(response)
        assert payload["reset_album_cooldown_result"]["success"] is True

        row = db.c.fetch_row(
            "SELECT album_cool_multiply, album_cool_override FROM r4_album_sid WHERE album_id = %s AND sid = %s",
            (album_id, 1),
        )
        assert row is not None
        assert row["album_cool_multiply"] == pytest.approx(1.0)
        assert row["album_cool_override"] is None
