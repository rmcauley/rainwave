from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestTipJar(RequestClassesTestCase):
    @gen_test
    async def test_tip_jar_empty(self) -> None:
        response = await self.post_form(
            "/api4/admin/add_donation",
            {
                "user_id": SITE_ADMIN_USER_ID,
                "key": SITE_ADMIN_API_KEY,
                "sid": 1,
                "donor_id": SITE_ADMIN_USER_ID,
                "amount": 5,
                "message": "Thanks",
                "private": "false",
            },
        )
        payload = self.payload(response)
        assert payload["add_donation_result"]["tl_key"] == "success"

        response = await self.get_path("/pages/tip_jar")
        page = response.body.decode("utf-8")
        assert "Thanks" in page
