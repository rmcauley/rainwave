from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase


class TestKeyManagement(RequestClassesTestCase):
    @gen_test
    async def test_keys_requires_login(self) -> None:
        response = await self.get_path("/keys/", raise_error=False)
        assert response.code == 403

    @gen_test
    async def test_keys_create_requires_login(self) -> None:
        response = await self.get_path("/keys/create", raise_error=False)
        assert response.code == 403

    @gen_test
    async def test_keys_delete_requires_login(self) -> None:
        response = await self.get_path(
            "/keys/delete?delete_key=1",
            raise_error=False,
        )
        assert response.code == 403
