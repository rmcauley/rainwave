from typing import TypedDict

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from common.db.cursor import get_cursor
import pytest
from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
)


class SongCooldownRow(TypedDict):
    song_cool_multiply: float
    song_cool_override: int | None


class AlbumCooldownRow(TypedDict):
    album_cool_multiply: float
    album_cool_override: int | None


class TestAdminCooldownGroups(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    async def _first_album_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        return int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])

    async def _first_song_id(self) -> int:
        album_id = await self._first_album_id()
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        return int(self.payload(response)["album"]["songs"][0]["id"])

    @gen_test
    async def test_song_cooldown_update_and_reset(self) -> None:
        song_id = await self._first_song_id()
        override = 1200
        response = await self.post_form(
            "/api4/admin/set_song_cooldown",
            self._auth_data(song_id=song_id, multiply=1.1, override=override),
        )
        payload = self.payload(response)
        assert payload["set_song_cooldown_result"]["success"] is True

        async with get_cursor() as cursor:
            row = await cursor.fetch_row(
                "SELECT song_cool_multiply, song_cool_override FROM r4_songs WHERE song_id = %s",
                (song_id,),
                row_type=SongCooldownRow,
            )
        assert row is not None
        assert row["song_cool_multiply"] == pytest.approx(1.1)
        assert row["song_cool_override"] == override

        response = await self.post_form(
            "/api4/admin/reset_song_cooldown",
            self._auth_data(song_id=song_id),
        )
        payload = self.payload(response)
        assert payload["reset_song_cooldown_result"]["success"] is True

        async with get_cursor() as cursor:
            row = await cursor.fetch_row(
                "SELECT song_cool_multiply, song_cool_override FROM r4_songs WHERE song_id = %s",
                (song_id,),
                row_type=SongCooldownRow,
            )
        assert row is not None
        assert row["song_cool_multiply"] == pytest.approx(1.0)
        assert row["song_cool_override"] is None

    @gen_test
    async def test_album_cooldown_update_and_reset(self) -> None:
        album_id = await self._first_album_id()
        override = 1800
        response = await self.post_form(
            "/api4/admin/set_album_cooldown",
            self._auth_data(album_id=album_id, multiply=1.2, override=override),
        )
        payload = self.payload(response)
        assert payload["set_album_cooldown_result"]["success"] is True

        async with get_cursor() as cursor:
            row = await cursor.fetch_row(
                "SELECT album_cool_multiply, album_cool_override FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (album_id, 1),
                row_type=AlbumCooldownRow,
            )
        assert row is not None
        assert row["album_cool_multiply"] == pytest.approx(1.2)
        assert row["album_cool_override"] == override

        response = await self.post_form(
            "/api4/admin/reset_album_cooldown",
            self._auth_data(album_id=album_id),
        )
        payload = self.payload(response)
        assert payload["reset_album_cooldown_result"]["success"] is True

        async with get_cursor() as cursor:
            row = await cursor.fetch_row(
                "SELECT album_cool_multiply, album_cool_override FROM r4_album_sid WHERE album_id = %s AND sid = %s",
                (album_id, 1),
                row_type=AlbumCooldownRow,
            )
        assert row is not None
        assert row["album_cool_multiply"] == pytest.approx(1.0)
        assert row["album_cool_override"] is None

    @gen_test
    async def test_admin_cooldown_commands_require_admin_user(self) -> None:
        song_id = await self._first_song_id()
        album_id = await self._first_album_id()
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )

        response = await self.post_form(
            "/api4/admin/set_song_cooldown",
            {**auth_data, "song_id": song_id, "multiply": 1.1, "override": 1200},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["set_song_cooldown_result"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/reset_song_cooldown",
            {**auth_data, "song_id": song_id},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["reset_song_cooldown_result"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/set_album_cooldown",
            {**auth_data, "album_id": album_id, "multiply": 1.2, "override": 1800},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["set_album_cooldown_result"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/reset_album_cooldown",
            {**auth_data, "album_id": album_id},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["reset_album_cooldown_result"]["tl_key"] == "admin_required"
