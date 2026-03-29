from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestSearch(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    @gen_test
    async def test_search_too_short(self) -> None:
        response = await self.post_form(
            "/api4/search",
            self._auth_data(search="so"),
            raise_error=False,
        )
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "search_string_too_short"

    @gen_test
    async def test_search_finds_songs(self) -> None:
        response = await self.post_form("/api4/search", self._auth_data(search="Song"))
        payload = self.payload(response)
        assert payload["songs"]
