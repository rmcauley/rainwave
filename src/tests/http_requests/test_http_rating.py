from typing import Any

import pytest
from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormData, FormValue, RequestClassesTestCase
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


class TestRating(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    def _anon_auth_data(self, **extra: FormValue) -> AuthData:
        return self._auth_data(
            user_id=ANONYMOUS_USER_ID, key=ANONYMOUS_API_KEY, **extra
        )

    async def _current_song_id(self, auth_data: FormData) -> int:
        response = await self.post_form("/api4/info", auth_data)
        payload: Any = self.payload(response)
        sched_current: Any = payload.get("sched_current") or {}
        songs: list[Any] = sched_current.get("songs") or []
        if not songs:
            pytest.skip("No current song available for rating tests.")
        return int(songs[0]["id"])

    async def _first_song_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        album_id = int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        return int(self.payload(response)["album"]["songs"][0]["id"])

    @gen_test
    async def test_rate_requires_login(self) -> None:
        song_id = await self._first_song_id()
        response = await self.post_form(
            "/api4/rate",
            self._anon_auth_data(song_id=song_id, rating=4.0),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_rate_allows_donor_when_tuned_out(self) -> None:
        auth_data = self._auth_data(
            user_id=TUNED_OUT_DONOR_USER_ID,
            key=TUNED_OUT_DONOR_API_KEY,
        )
        song_id = await self._current_song_id(auth_data)
        response = await self.post_form(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 4.5},
        )
        payload = self.payload(response)
        assert payload["rate_result"]["success"] is True

        info_payload: Any = self.payload(await self.post_form("/api4/info", auth_data))
        sched_current: Any = info_payload.get("sched_current") or {}
        songs: list[Any] = sched_current.get("songs") or []
        assert songs
        assert songs[0]["id"] == song_id
        assert songs[0]["rating_user"] == 4.5

    @gen_test
    async def test_rate_allows_tuned_in_user(self) -> None:
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )
        song_id = await self._current_song_id(auth_data)
        response = await self.post_form(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 3.5},
        )
        payload = self.payload(response)
        assert payload["rate_result"]["success"] is True

    @gen_test
    async def test_rate_rejects_tuned_out_user(self) -> None:
        auth_data = self._auth_data(
            user_id=TUNED_OUT_LOGGED_IN_USER_ID,
            key=TUNED_OUT_LOGGED_IN_API_KEY,
        )
        song_id = await self._current_song_id(auth_data)
        response = await self.post_form(
            "/api4/rate",
            {**auth_data, "song_id": song_id, "rating": 2.5},
            raise_error=False,
        )
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "tunein_to_rate_current_song"
