import time
from typing import TypedDict

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from api.rainwave_typeddicts import AdminPowerHour, AdminPowerHours, AdminPowerHourSong
from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
)


class AdminPowerHourResponse(TypedDict):
    admin_power_hour: AdminPowerHour


class AdminPowerHoursResponse(TypedDict):
    admin_power_hours: AdminPowerHours


class TestAdminPowerHours(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    def _non_admin_auth_data(self, **extra: FormValue) -> AuthData:
        data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )
        data.update(extra)
        return data

    def _songs(self, power_hour: AdminPowerHour) -> list[AdminPowerHourSong]:
        assert "songs" in power_hour
        return power_hour["songs"]

    async def _first_album_and_song_ids(self) -> tuple[int, int, int]:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        album_id = int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])

        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        songs = self.payload(response)["album"]["songs"]
        return album_id, int(songs[0]["id"]), int(songs[1]["id"])

    async def _create_power_hour(self) -> AdminPowerHour:
        now = int(time.time()) + 86400
        response = await self.post_form(
            "/api4/admin/create_power_hour",
            self._auth_data(
                name="Test Power Hour",
                start_utc_time=now,
                end_utc_time=now + 3600,
                url="test-power-hour",
                fill_unrated=False,
                sid=1,
            ),
        )
        payload: AdminPowerHourResponse = self.payload(response)
        return payload["admin_power_hour"]

    @gen_test
    async def test_admin_power_hour_crud_and_listing(self) -> None:
        created = await self._create_power_hour()
        sched_id = int(created["sched_id"])

        response = await self.post_form(
            "/api4/admin/power_hour",
            self._auth_data(sched_id=sched_id),
        )
        payload: AdminPowerHourResponse = self.payload(response)
        assert payload["admin_power_hour"]["sched_id"] == sched_id

        response = await self.post_form("/api4/admin/power_hours", self._auth_data())
        power_hours = self.payload(response)["admin_power_hours"]
        assert any(
            int(power_hour["sched_id"]) == sched_id for power_hour in power_hours
        )

        response = await self.post_form(
            "/api4/admin/delete_power_hour",
            self._auth_data(sched_id=sched_id),
        )
        assert response.code == 200

        response = await self.post_form(
            "/api4/admin/power_hour",
            self._auth_data(sched_id=sched_id),
            raise_error=False,
        )
        assert response.code == 404

    @gen_test
    async def test_admin_power_hour_song_and_metadata_mutations(self) -> None:
        created = await self._create_power_hour()
        sched_id = int(created["sched_id"])
        album_id, song_id_1, song_id_2 = await self._first_album_and_song_ids()

        response = await self.post_form(
            "/api4/admin/add_song_to_power_hour",
            self._auth_data(sched_id=sched_id, song_id=song_id_1),
        )
        payload: AdminPowerHourResponse = self.payload(response)
        songs = self._songs(payload["admin_power_hour"])
        assert len(songs) == 1
        one_up_id = int(songs[0]["one_up_id"])

        response = await self.post_form(
            "/api4/admin/add_song_to_power_hour",
            self._auth_data(sched_id=sched_id, song_id=song_id_2),
        )
        payload = self.payload(response)
        songs = self._songs(payload["admin_power_hour"])
        assert len(songs) == 2
        second_one_up_id = int(songs[1]["one_up_id"])

        response = await self.post_form(
            "/api4/admin/order_power_hour_songs",
            self._auth_data(sched_id=sched_id, order=f"{second_one_up_id},{one_up_id}"),
        )
        payload = self.payload(response)
        songs = self._songs(payload["admin_power_hour"])
        assert int(songs[0]["one_up_id"]) == second_one_up_id
        assert int(songs[1]["one_up_id"]) == one_up_id

        response = await self.post_form(
            "/api4/admin/shuffle_power_hour",
            self._auth_data(sched_id=sched_id),
        )
        assert self.payload(response)["admin_power_hour"]["sched_id"] == sched_id

        response = await self.post_form(
            "/api4/admin/power_hour_remove_song",
            self._auth_data(one_up_id=one_up_id),
        )
        payload = self.payload(response)
        songs = self._songs(payload["admin_power_hour"])
        assert len(songs) == 1

        response = await self.post_form(
            "/api4/admin/add_album_to_power_hour",
            self._auth_data(sched_id=sched_id, album_id=album_id),
        )
        payload = self.payload(response)
        songs = self._songs(payload["admin_power_hour"])
        assert len(songs) >= 20

        response = await self.post_form(
            "/api4/admin/change_power_hour_name",
            self._auth_data(sched_id=sched_id, name="Renamed Power Hour"),
        )
        payload = self.payload(response)
        assert payload["admin_power_hour"]["sched_name"] == "Renamed Power Hour"

        response = await self.post_form(
            "/api4/admin/change_power_hour_url",
            self._auth_data(sched_id=sched_id, url="renamed-url"),
        )
        payload = self.payload(response)
        assert payload["admin_power_hour"]["sched_url"] == "renamed-url"

        created_start = created["sched_start"]
        assert created_start is not None
        new_start = created_start + 7200
        response = await self.post_form(
            "/api4/admin/change_power_hour_start_time",
            self._auth_data(sched_id=sched_id, utc_time=new_start),
        )
        payload = self.payload(response)
        updated_start = payload["admin_power_hour"]["sched_start"]
        assert updated_start is not None
        assert updated_start == new_start

        response = await self.post_form(
            "/api4/admin/duplicate_power_hour",
            self._auth_data(sched_id=sched_id),
        )
        payload = self.payload(response)
        duplicated_sched_id = int(payload["admin_power_hour"]["sched_id"])
        assert duplicated_sched_id != sched_id

        response = await self.post_form(
            "/api4/admin/europify_power_hour",
            self._auth_data(sched_id=sched_id),
        )
        payload = self.payload(response)
        sched_name = payload["admin_power_hour"]["sched_name"]
        assert sched_name is not None
        assert sched_name.endswith("Reprisal")

    @gen_test
    async def test_admin_power_hour_routes_require_admin(self) -> None:
        created = await self._create_power_hour()
        sched_id = int(created["sched_id"])

        response = await self.post_form(
            "/api4/admin/power_hours",
            self._non_admin_auth_data(),
            raise_error=False,
        )
        assert response.code == 403
        assert self.payload(response)["error"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/power_hour",
            self._non_admin_auth_data(sched_id=sched_id),
            raise_error=False,
        )
        assert response.code == 403

        response = await self.post_form(
            "/api4/admin/delete_power_hour",
            self._non_admin_auth_data(sched_id=sched_id),
            raise_error=False,
        )
        assert response.code == 403
