from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    SITE_ADMIN_USER_NAME,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
)


class TestAdminCore(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    async def _first_song_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        album_id = int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        return int(self.payload(response)["album"]["songs"][0]["id"])

    @gen_test
    async def test_set_song_request_only(self) -> None:
        song_id = await self._first_song_id()
        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="true"),
        )
        payload = self.payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="false"),
        )
        payload = self.payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

    @gen_test
    async def test_user_search(self) -> None:
        response = await self.post_form(
            "/api4/user_search",
            {"username": SITE_ADMIN_USER_NAME},
        )
        payload = self.payload(response)
        assert payload["user"]["user_id"] == SITE_ADMIN_USER_ID

    @gen_test
    async def test_user_search_by_discord_user_id(self) -> None:
        response = await self.post_form(
            "/api4/user_search_by_discord_user_id",
            {"discord_user_id": "missing"},
        )
        payload = self.payload(response)
        assert payload["user"]["user_id"] is None

    @gen_test
    async def test_update_user_avatar_by_discord_id(self) -> None:
        response = await self.post_form(
            "/api4/update_user_avatar_by_discord_id",
            {"discord_user_id": "missing", "avatar": "http://example.com/a.png"},
        )
        payload = self.payload(response)
        assert payload["update_user_avatar_by_discord_id_result"]["tl_key"] == "yes"

    @gen_test
    async def test_update_user_nickname_by_discord_id(self) -> None:
        response = await self.post_form(
            "/api4/update_user_nickname_by_discord_id",
            {"discord_user_id": "missing", "nickname": "NewNick"},
        )
        payload = self.payload(response)
        assert payload["update_user_nickname_by_discord_id_result"]["tl_key"] == "yes"

    @gen_test
    async def test_enable_perks_by_discord_ids(self) -> None:
        response = await self.post_form(
            "/api4/enable_perks_by_discord_ids",
            {"discord_user_ids": "a,b"},
        )
        payload = self.payload(response)
        assert payload["enable_perks_by_discord_ids_result"]["tl_key"] == "yes"

    @gen_test
    async def test_admin_backend_scan_errors(self) -> None:
        response = await self.post_form(
            "/api4/admin/backend_scan_errors",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert "backend_scan_errors" in payload or "js_errors" in payload

    @gen_test
    async def test_admin_request_line(self) -> None:
        response = await self.post_form("/api4/admin/request_line", self._auth_data())
        payload = self.payload(response)
        assert payload["request_line"] is None or isinstance(
            payload["request_line"], list
        )

    @gen_test
    async def test_admin_commands_require_admin_user(self) -> None:
        song_id = await self._first_song_id()
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )

        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            {**auth_data, "song_id": song_id, "request_only": "true"},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["set_song_request_only_result"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/backend_scan_errors",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["backend_scan_errors"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/request_line",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["request_line"]["tl_key"] == "admin_required"
