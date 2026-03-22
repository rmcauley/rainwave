from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import RequestClassesTestCase


class TestListenerDetect(RequestClassesTestCase):
    @gen_test
    async def test_listener_add_anonymous_no_listen_key(self) -> None:
        response = await self.post_form(
            "/api4/listener_add/1",
            {
                "client": 1,
                "mount": "/station.mp3",
                "ip": "127.0.0.1",
                "agent": "VLC",
            },
            raise_error=False,
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"

    @gen_test
    async def test_listener_add_and_remove_with_listen_key(self) -> None:
        response = await self.post_form(
            "/api4/listener_add/1",
            {
                "client": 2,
                "mount": "/station.mp3?1:aaaaaaaaaa&127.0.0.1",
                "ip": "127.0.0.1",
                "agent": "VLC",
            },
            raise_error=False,
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"

        response = await self.post_form(
            "/api4/listener_remove",
            {"client": 2},
            raise_error=False,
        )
        assert response.code == 200
        assert response.headers.get("icecast-auth-user") == "1"
