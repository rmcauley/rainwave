from typing import Any, cast

import pytest
from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestFave(RequestClassesTestCase):
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

    async def _first_album_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        return int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])

    async def _first_song_id(self, album_id: int) -> int:
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        return int(self.payload(response)["album"]["songs"][0]["id"])

    async def _info_payload(self) -> Any:
        response = await self.post_form("/api4/info", self._auth_data())
        return self.payload(response)

    def _find_event_with_songs(self, payload: Any, min_count: int = 1) -> Any:
        current: Any = payload.get("sched_current") or {}
        if current.get("songs") and len(current["songs"]) >= min_count:
            return current
        for event in cast(list[Any], payload.get("sched_next") or []):
            if event.get("songs") and len(event["songs"]) >= min_count:
                return event
        pytest.skip("No schedule event with enough songs to run fave tests.")

    def _find_song(self, payload: Any, song_id: int) -> Any:
        events = [payload.get("sched_current")] + cast(
            list[Any], payload.get("sched_next") or []
        )
        for event in events:
            if not event or not event.get("songs"):
                continue
            for song in event["songs"]:
                if song.get("id") == song_id:
                    return song
        return None

    @gen_test
    async def test_info_song_fave_toggle(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song = event["songs"][0]
        song_id = song["id"]

        response = await self.post_form(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="true"),
        )
        payload = self.payload(response)
        assert payload["fave_song_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song_id)
        assert song is not None
        assert song["fave"] is True

        response = await self.post_form(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_song_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song_id)
        assert song is not None
        assert song["fave"] is False

    @gen_test
    async def test_info_song_fave_toggle_anonymous_fails(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song_id = event["songs"][0]["id"]

        response = await self.post_form(
            "/api4/fave_song",
            self._anon_auth_data(song_id=song_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_fave_song_toggle(self) -> None:
        album_id = await self._first_album_id()
        song_id = await self._first_song_id(album_id)

        response = await self.post_form(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="true"),
        )
        payload = self.payload(response)
        assert payload["fave_song_result"]["success"] is True
        assert payload["fave_song_result"]["fave"] is True

        response = await self.post_form(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_song_result"]["success"] is True
        assert payload["fave_song_result"]["fave"] is False

    @gen_test
    async def test_fave_song_toggle_anonymous_fails(self) -> None:
        album_id = await self._first_album_id()
        song_id = await self._first_song_id(album_id)
        response = await self.post_form(
            "/api4/fave_song",
            self._anon_auth_data(song_id=song_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_fave_album_toggle(self) -> None:
        album_id = await self._first_album_id()

        response = await self.post_form(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self.payload(response)
        assert payload["fave_album_result"]["success"] is True
        assert payload["fave_album_result"]["fave"] is True

        response = await self.post_form(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_album_result"]["success"] is True
        assert payload["fave_album_result"]["fave"] is False

    @gen_test
    async def test_fave_album_toggle_anonymous_fails(self) -> None:
        album_id = await self._first_album_id()
        response = await self.post_form(
            "/api4/fave_album",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_info_album_fave_toggle(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song = event["songs"][0]
        album_id = song["albums"][0]["id"]

        response = await self.post_form(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self.payload(response)
        assert payload["fave_album_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["albums"][0]["fave"] is True

        response = await self.post_form(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_album_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["albums"][0]["fave"] is False

    @gen_test
    async def test_info_album_fave_toggle_anonymous_fails(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        album_id = event["songs"][0]["albums"][0]["id"]

        response = await self.post_form(
            "/api4/fave_album",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_fave_all_songs_unfave(self) -> None:
        album_id = await self._first_album_id()
        response = await self.post_form(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_all_songs_result"]["success"] is True
        assert payload["fave_all_songs_result"]["fave"] is False
        assert len(payload["fave_all_songs_result"]["song_ids"]) == 20

    @gen_test
    async def test_fave_all_songs_unfave_anonymous_fails(self) -> None:
        album_id = await self._first_album_id()
        response = await self.post_form(
            "/api4/fave_all_songs",
            self._anon_auth_data(album_id=album_id, fave="false"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"

    @gen_test
    async def test_info_fave_all_songs_toggle(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=2)
        song = event["songs"][1]
        album_id = song["albums"][0]["id"]

        response = await self.post_form(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self.payload(response)
        assert payload["fave_all_songs_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["fave"] is True

        response = await self.post_form(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self.payload(response)
        assert payload["fave_all_songs_result"]["success"] is True

        payload = await self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["fave"] is False

    @gen_test
    async def test_info_fave_all_songs_toggle_anonymous_fails(self) -> None:
        payload = await self._info_payload()
        event = self._find_event_with_songs(payload, min_count=2)
        album_id = event["songs"][1]["albums"][0]["id"]

        response = await self.post_form(
            "/api4/fave_all_songs",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "login_required"
