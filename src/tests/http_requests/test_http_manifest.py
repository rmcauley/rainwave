from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase


class TestManifest(RequestClassesTestCase):
    @gen_test
    async def test_manifest_with_sid(self) -> None:
        response = await self.get_path("/manifest.json?sid=1", raise_error=False)
        assert response.code == 200
        assert (
            response.headers.get("Content-Type")
            == "application/x-web-app-manifest+json"
        )
        payload = self.payload(response)
        assert payload["name"].startswith("Rainwave")
        assert payload["short_name"]
