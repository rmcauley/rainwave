from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestRequest(RequestClassesTestCase):
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

    @gen_test
    async def test_delete_request_fails_when_missing(self) -> None:
        response = await self.post_form(
            "/api4/delete_request",
            self._auth_data(song_id=5),
            raise_error=False,
        )
        payload = self.payload(response)
        assert response.code == 200
        assert payload["delete_request_result"]["tl_key"] == "song_not_requested"

        response = await self.post_form(
            "/api4/delete_request",
            self._anon_auth_data(song_id=5),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["delete_request_result"]["tl_key"] == "login_required"

    @gen_test
    async def test_request_favorited_fails(self) -> None:
        response = await self.post_form(
            "/api4/request_favorited_songs",
            self._auth_data(),
            raise_error=False,
        )
        assert response.code == 200
        payload = self.payload(response)
        assert (
            payload["request_favorited_songs_result"]["tl_key"]
            == "request_favorited_failed"
        )

        response = await self.post_form(
            "/api4/request_favorited_songs",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["request_favorited_songs_result"]["tl_key"] == "login_required"

    @gen_test
    async def test_clear_requests(self) -> None:
        response = await self.post_form("/api4/clear_requests", self._auth_data())
        payload = self.payload(response)
        assert "requests" in payload

        response = await self.post_form(
            "/api4/clear_requests",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["clear_requests_result"]["tl_key"] == "login_required"

    @gen_test
    async def test_clear_requests_on_cooldown(self) -> None:
        response = await self.post_form(
            "/api4/clear_requests_on_cooldown",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert "requests" in payload

        response = await self.post_form(
            "/api4/clear_requests_on_cooldown",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert (
            payload["clear_requests_on_cooldown_result"]["tl_key"] == "login_required"
        )

    @gen_test
    async def test_pause_unpause_request_queue(self) -> None:
        response = await self.post_form("/api4/pause_request_queue", self._auth_data())
        payload = self.payload(response)
        assert "user" in payload

        response = await self.post_form(
            "/api4/unpause_request_queue",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert "user" in payload

        response = await self.post_form(
            "/api4/pause_request_queue",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["pause_request_queue_result"]["tl_key"] == "login_required"

        response = await self.post_form(
            "/api4/unpause_request_queue",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["unpause_request_queue_result"]["tl_key"] == "login_required"

    @gen_test
    async def test_request_line(self) -> None:
        response = await self.post_form("/api4/request_line", self._auth_data())
        payload = self.payload(response)
        assert payload["request_line"] is None or isinstance(
            payload["request_line"], list
        )
