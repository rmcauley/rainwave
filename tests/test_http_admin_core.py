from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestAdminCore(AsyncHTTPTestCase):
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

    def _first_song_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        album_id = self._payload(response)["all_albums"][0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def test_set_song_request_only(self):
        song_id = self._first_song_id()
        response = self._post(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="true"),
        )
        payload = self._payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

        response = self._post(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="false"),
        )
        payload = self._payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

    def test_user_search(self):
        response = self._post("/api4/user_search", {"username": "Test"})
        payload = self._payload(response)
        assert payload["user"]["user_id"] == 2

    def test_user_search_by_discord_user_id(self):
        response = self._post(
            "/api4/user_search_by_discord_user_id",
            {"discord_user_id": "missing"},
        )
        payload = self._payload(response)
        assert payload["user"]["user_id"] is None

    def test_update_user_avatar_by_discord_id(self):
        response = self._post(
            "/api4/update_user_avatar_by_discord_id",
            {"discord_user_id": "missing", "avatar": "http://example.com/a.png"},
        )
        payload = self._payload(response)
        assert payload["update_user_avatar_by_discord_id_result"]["tl_key"] == "yes"

    def test_update_user_nickname_by_discord_id(self):
        response = self._post(
            "/api4/update_user_nickname_by_discord_id",
            {"discord_user_id": "missing", "nickname": "NewNick"},
        )
        payload = self._payload(response)
        assert payload["update_user_nickname_by_discord_id_result"]["tl_key"] == "yes"

    def test_enable_perks_by_discord_ids(self):
        response = self._post(
            "/api4/enable_perks_by_discord_ids",
            {"discord_user_ids": "a,b"},
        )
        payload = self._payload(response)
        assert payload["enable_perks_by_discord_ids_result"]["tl_key"] == "yes"

    def test_add_donation(self):
        response = self._post(
            "/api4/admin/add_donation",
            self._auth_data(donor_id=2, amount=5, message="Thanks", private="false"),
        )
        payload = self._payload(response)
        assert payload["add_donation_result"]["tl_key"] == "donation_added"

    def test_admin_backend_scan_errors(self):
        response = self._post("/api4/admin/backend_scan_errors", self._auth_data())
        payload = self._payload(response)
        assert "backend_scan_errors" in payload or "js_errors" in payload

    def test_admin_request_line(self):
        response = self._post("/api4/admin/request_line", self._auth_data())
        payload = self._payload(response)
        assert payload["request_line"] is None or isinstance(
            payload["request_line"], list
        )
