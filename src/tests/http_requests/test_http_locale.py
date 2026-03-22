from typing import Any

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase


class TestLocale(RequestClassesTestCase):
    def app_settings(self) -> dict[str, Any]:
        return {"template_path": "templates"}

    @gen_test
    async def test_locale_index(self) -> None:
        response = await self.get_path("/locale/", raise_error=False)
        assert response.code == 200
        assert b"Locale/Translation Information" in response.body

    @gen_test
    async def test_locale_missing_lines_exists(self) -> None:
        response = await self.get_path("/locale/en_CA", raise_error=False)
        assert response.code == 200
        assert b"Missing Lines" in response.body

    @gen_test
    async def test_locale_missing_lines_unknown(self) -> None:
        response = await self.get_path("/locale/zz_ZZ", raise_error=False)
        assert response.code == 404
