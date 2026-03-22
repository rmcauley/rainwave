from typing import Any

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestInfo(RequestClassesTestCase):
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
    async def test_info_all_returns_station_info(self) -> None:
        response = await self.post_form("/api4/info_all", self._auth_data())
        payload = self.payload(response)
        assert "all_stations_info" in payload
        assert "1" in payload["all_stations_info"]

    @gen_test
    async def test_info_all_returns_station_info_anonymous(self) -> None:
        response = await self.post_form("/api4/info_all", self._anon_auth_data())
        payload = self.payload(response)
        assert "all_stations_info" in payload
        assert "1" in payload["all_stations_info"]

    @gen_test
    async def test_stations_returns_list(self) -> None:
        response = await self.post_form("/api4/stations", self._auth_data())
        payload = self.payload(response)
        stations: list[Any] = payload["stations"]
        assert isinstance(stations, list)
        assert len(stations) == 1
        assert {"id", "name", "description", "stream", "relays", "key"}.issubset(
            stations[0].keys()
        )
