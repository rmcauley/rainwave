from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, RequestClassesTestCase
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestErrorReport(RequestClassesTestCase):
    @gen_test
    async def test_error_report_accepts_localhost_referer(self) -> None:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "name": "TestError",
            "message": "Something went wrong",
            "stack": "stack trace",
            "location": "http://localhost/",
            "user_agent": "pytest",
            "browser_language": "en-US",
        }
        response = await self.post_form(
            "/api4/error_report",
            data,
            headers={"Referer": "http://localhost/"},
        )
        payload = self.payload(response)
        assert payload["error_report_result"]["success"] is True
