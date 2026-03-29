from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestListener(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    @gen_test
    async def test_listener_detail(self) -> None:
        response = await self.post_form(
            "/api4/listener",
            self._auth_data(id=SITE_ADMIN_USER_ID),
        )
        payload = self.payload(response)
        listener = payload["listener"]
        assert listener["user_id"] == SITE_ADMIN_USER_ID
        assert "top_albums" in listener
        assert "rating_spread" in listener

    @gen_test
    async def test_user_info(self) -> None:
        response = await self.post_form("/api4/user_info", self._auth_data())
        payload = self.payload(response)
        assert payload["user_info"]["id"] == SITE_ADMIN_USER_ID
