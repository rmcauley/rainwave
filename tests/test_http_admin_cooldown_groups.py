from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


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
        data = {"user_id": 2, "key": "TESTKEY", "sid": 1}
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
        response = self._post(
            "/api4/admin/set_song_cooldown",
            self._auth_data(song_id=song_id, multiply=1.1),
        )
        payload = self._payload(response)
        assert payload["set_song_cooldown_result"]["success"] is True

        response = self._post(
            "/api4/admin/reset_song_cooldown",
            self._auth_data(song_id=song_id),
        )
        payload = self._payload(response)
        assert payload["reset_song_cooldown_result"]["success"] is True

    def test_album_cooldown_update_and_reset(self):
        album_id = self._first_album_id()
        response = self._post(
            "/api4/admin/set_album_cooldown",
            self._auth_data(album_id=album_id, multiply=1.2),
        )
        payload = self._payload(response)
        assert payload["set_album_cooldown_result"]["success"] is True

        response = self._post(
            "/api4/admin/reset_album_cooldown",
            self._auth_data(album_id=album_id),
        )
        payload = self._payload(response)
        assert payload["reset_album_cooldown_result"]["success"] is True

    def test_group_edits_and_create(self):
        group_id = self._first_group_id()
        response = self._post(
            "/api4/admin/edit_group_elec_block",
            self._auth_data(group_id=group_id, elec_block=1),
        )
        payload = self._payload(response)
        assert payload["edit_group_elec_block_result"]["tl_key"] == "group_edit_success"

        response = self._post(
            "/api4/admin/edit_group_cooldown",
            self._auth_data(group_id=group_id, cooldown=1200),
        )
        payload = self._payload(response)
        assert payload["edit_group_cooldown_result"]["tl_key"] == "group_edit_success"

        response = self._post(
            "/api4/admin/create_group",
            self._auth_data(name="New Group"),
        )
        payload = self._payload(response)
        assert payload["create_group_result"]["tl_key"] == "group_create_success"

    def test_remove_group_from_song_errors(self):
        song_id = self._first_song_id()
        group_id = self._first_group_id()
        response = self._post(
            "/api4/admin/remove_group_from_song",
            self._auth_data(song_id=song_id, group_id=group_id),
            raise_error=False,
        )
        payload = self._payload(response)
        assert payload["error"]["tl_key"] == "internal_error"
