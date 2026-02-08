import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    SITE_ADMIN_USER_NAME,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
)


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
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
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

        # Check database to see if request set request_only to true

        response = self._post(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="false"),
        )
        payload = self._payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

        # Check database to see if request set request_only to false

    def test_user_search(self):
        response = self._post("/api4/user_search", {"username": SITE_ADMIN_USER_NAME})
        payload = self._payload(response)
        assert payload["user"]["user_id"] == SITE_ADMIN_USER_ID

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

    def test_admin_commands_require_admin_user(self):
        song_id = self._first_song_id()
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )

        response = self._post(
            "/api4/admin/set_song_request_only",
            {**auth_data, "song_id": song_id, "request_only": "true"},
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["set_song_request_only_result"]["tl_key"] == "admin_required"

        response = self._post(
            "/api4/admin/backend_scan_errors",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["backend_scan_errors"]["tl_key"] == "admin_required"

        response = self._post(
            "/api4/admin/request_line",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["request_line"]["tl_key"] == "admin_required"
