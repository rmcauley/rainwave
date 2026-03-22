from typing import Any, cast

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from common.db.cursor import get_cursor
import pytest
from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_ANONYMOUS_IP,
    TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_LOGGED_IN_API_KEY,
    TUNED_OUT_LOGGED_IN_USER_ID,
)


class TestVote(RequestClassesTestCase):
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

    async def _first_election_entry(self) -> int:
        response = await self.post_form("/api4/info", self._auth_data())
        payload: Any = self.payload(response)
        for event in cast(list[Any], payload.get("sched_next") or []):
            songs: list[Any] = event.get("songs") or []
            if len(songs) > 1:
                entry_id = songs[0].get("entry_id")
                if entry_id:
                    return int(entry_id)
        pytest.skip("No upcoming election with voteable entries.")

    async def _set_anonymous_listener_purged(self, purged: bool) -> None:
        async with get_cursor() as cursor:
            await cursor.update(
                "UPDATE r4_listeners SET listener_purge = %s WHERE user_id = %s AND listener_ip = %s",
                (purged, ANONYMOUS_USER_ID, TUNED_IN_ANONYMOUS_IP),
            )

    @gen_test
    async def test_vote_allows_tuned_in_anonymous(self) -> None:
        entry_id = await self._first_election_entry()
        await self._set_anonymous_listener_purged(False)
        response = await self.post_form(
            "/api4/vote",
            self._anon_auth_data(entry_id=entry_id),
        )
        payload = self.payload(response)
        assert payload["vote_result"]["success"] is True

    @gen_test
    async def test_vote_rejects_tuned_out_anonymous(self) -> None:
        entry_id = await self._first_election_entry()
        await self._set_anonymous_listener_purged(True)
        try:
            response = await self.post_form(
                "/api4/vote",
                self._anon_auth_data(entry_id=entry_id),
                raise_error=False,
            )
            assert response.code == 403
            payload = self.payload(response)
            assert payload["vote_result"]["tl_key"] == "tunein_required"
        finally:
            await self._set_anonymous_listener_purged(False)

    @gen_test
    async def test_vote_allows_tuned_in_logged_in_user(self) -> None:
        entry_id = await self._first_election_entry()
        response = await self.post_form(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
                entry_id=entry_id,
            ),
        )
        payload = self.payload(response)
        assert payload["vote_result"]["success"] is True

    @gen_test
    async def test_vote_rejects_tuned_out_logged_in_user(self) -> None:
        entry_id = await self._first_election_entry()
        response = await self.post_form(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_OUT_LOGGED_IN_USER_ID,
                key=TUNED_OUT_LOGGED_IN_API_KEY,
                entry_id=entry_id,
            ),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["vote_result"]["tl_key"] == "tunein_required"

    @gen_test
    async def test_vote_rejects_locked_user(self) -> None:
        entry_id = await self._first_election_entry()
        response = await self.post_form(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                key=TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
                entry_id=entry_id,
            ),
            raise_error=False,
        )
        payload = self.payload(response)
        assert payload["vote_result"]["tl_key"] == "user_locked"
