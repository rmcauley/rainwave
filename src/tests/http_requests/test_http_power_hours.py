from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase


class TestPowerHours(RequestClassesTestCase):
    @gen_test
    async def test_power_hours_empty(self) -> None:
        response = await self.post_form("/api4/power_hours", {})
        payload = self.payload(response)
        assert payload["power_hours"] == []
