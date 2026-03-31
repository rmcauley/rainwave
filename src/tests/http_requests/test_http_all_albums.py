from typing import Any

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestAllAlbums(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    def _anon_auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": ANONYMOUS_USER_ID,
            "key": ANONYMOUS_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    async def _all_albums_paginated(self, anonymous: bool = False) -> Any:
        auth = self._anon_auth_data if anonymous else self._auth_data
        response = await self.post_form("/api4/all_albums_paginated", auth(after=0))
        return self.payload(response)["all_albums_paginated"]

    async def _all_artists_paginated(self, anonymous: bool = False) -> Any:
        auth = self._anon_auth_data if anonymous else self._auth_data
        response = await self.post_form("/api4/all_artists_paginated", auth(after=0))
        return self.payload(response)["all_artists_paginated"]

    async def _all_groups_paginated(self, anonymous: bool = False) -> Any:
        auth = self._anon_auth_data if anonymous else self._auth_data
        response = await self.post_form("/api4/all_groups_paginated", auth(after=0))
        return self.payload(response)["all_groups_paginated"]

    @gen_test
    async def test_all_albums_paginated(self) -> None:
        result = await self._all_albums_paginated()
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_albums_paginated_anonymous(self) -> None:
        result = await self._all_albums_paginated(anonymous=True)
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_albums_paginated_sorted_by_id(self) -> None:
        result = await self._all_albums_paginated()
        ids = [album["id"] for album in result["data"]]
        assert ids == sorted(ids)

    @gen_test
    async def test_all_albums_paginated_schema_fields(self) -> None:
        result = await self._all_albums_paginated()
        album = result["data"][0]
        expected_keys = {
            "id",
            "name",
            "rating",
            "cool",
            "cool_lowest",
            "fave",
            "rating_user",
            "rating_complete",
            "newest_song_time",
        }
        assert expected_keys.issubset(album.keys())

    @gen_test
    async def test_all_artists_paginated(self) -> None:
        result = await self._all_artists_paginated()
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000
        assert {"id", "name", "song_count"}.issubset(result["data"][0].keys())

    @gen_test
    async def test_all_artists_paginated_anonymous(self) -> None:
        result = await self._all_artists_paginated(anonymous=True)
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000
        assert {"id", "name", "song_count"}.issubset(result["data"][0].keys())

    @gen_test
    async def test_all_artists_paginated_sorted_by_id(self) -> None:
        result = await self._all_artists_paginated()
        ids = [artist["id"] for artist in result["data"]]
        assert ids == sorted(ids)

    @gen_test
    async def test_all_groups_paginated(self) -> None:
        result = await self._all_groups_paginated()
        assert len(result["data"]) == 10
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000
        assert {"id", "name"}.issubset(result["data"][0].keys())

    @gen_test
    async def test_all_groups_paginated_anonymous(self) -> None:
        result = await self._all_groups_paginated(anonymous=True)
        assert len(result["data"]) == 10
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000
        assert {"id", "name"}.issubset(result["data"][0].keys())

    @gen_test
    async def test_all_groups_paginated_sorted_by_id(self) -> None:
        result = await self._all_groups_paginated()
        ids = [group["id"] for group in result["data"]]
        assert ids == sorted(ids)

    @gen_test
    async def test_artist_details(self) -> None:
        artist_id = (await self._all_artists_paginated())["data"][0]["id"]
        response = await self.post_form("/api4/artist", self._auth_data(id=artist_id))
        payload = self.payload(response)
        assert payload["artist"]["id"] == artist_id
        assert "all_songs" in payload["artist"]

    @gen_test
    async def test_artist_details_anonymous(self) -> None:
        artist_id = (await self._all_artists_paginated(anonymous=True))["data"][0]["id"]
        response = await self.post_form(
            "/api4/artist",
            self._anon_auth_data(id=artist_id),
        )
        payload = self.payload(response)
        assert payload["artist"]["id"] == artist_id
        assert "all_songs" in payload["artist"]

    @gen_test
    async def test_group_details(self) -> None:
        group_id = (await self._all_groups_paginated())["data"][0]["id"]
        response = await self.post_form("/api4/group", self._auth_data(id=group_id))
        payload = self.payload(response)
        assert payload["group"]["id"] == group_id
        assert "all_songs_for_sid" in payload["group"]

    @gen_test
    async def test_group_details_anonymous(self) -> None:
        group_id = (await self._all_groups_paginated(anonymous=True))["data"][0]["id"]
        response = await self.post_form(
            "/api4/group",
            self._anon_auth_data(id=group_id),
        )
        payload = self.payload(response)
        assert payload["group"]["id"] == group_id
        assert "all_songs_for_sid" in payload["group"]

    @gen_test
    async def test_album_details(self) -> None:
        album_id = (await self._all_albums_paginated())["data"][0]["id"]
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        payload = self.payload(response)
        assert payload["album"]["id"] == album_id
        assert len(payload["album"]["songs"]) == 20

    @gen_test
    async def test_album_details_anonymous(self) -> None:
        album_id = (await self._all_albums_paginated(anonymous=True))["data"][0]["id"]
        response = await self.post_form(
            "/api4/album",
            self._anon_auth_data(id=album_id),
        )
        payload = self.payload(response)
        assert payload["album"]["id"] == album_id
        assert len(payload["album"]["songs"]) == 20

    @gen_test
    async def test_song_details(self) -> None:
        album_id = (await self._all_albums_paginated())["data"][0]["id"]
        album = self.payload(
            await self.post_form("/api4/album", self._auth_data(id=album_id))
        )["album"]
        song_id = album["songs"][0]["id"]
        response = await self.post_form("/api4/song", self._auth_data(id=song_id))
        payload = self.payload(response)
        song = payload["song"]
        assert song["album"]
        assert song["artists"]
        assert song["groups"]
        assert song["album"][0]["id"] == album_id

    @gen_test
    async def test_song_details_anonymous(self) -> None:
        album_id = (await self._all_albums_paginated(anonymous=True))["data"][0]["id"]
        album = self.payload(
            await self.post_form("/api4/album", self._anon_auth_data(id=album_id))
        )["album"]
        song_id = album["songs"][0]["id"]
        response = await self.post_form("/api4/song", self._anon_auth_data(id=song_id))
        payload = self.payload(response)
        song = payload["song"]
        assert song["album"]
        assert song["artists"]
        assert song["groups"]
        assert song["album"][0]["id"] == album_id

    @gen_test
    async def test_all_songs_default_limit(self) -> None:
        response = await self.post_form("/api4/all_songs", self._auth_data())
        payload = self.payload(response)
        assert len(payload["all_songs"]) == 100
        assert {"id", "title", "album_name", "rating", "rating_user", "fave"}.issubset(
            payload["all_songs"][0].keys()
        )

    @gen_test
    async def test_unrated_songs_default_limit(self) -> None:
        response = await self.post_form("/api4/unrated_songs", self._auth_data())
        payload = self.payload(response)
        assert len(payload["unrated_songs"]) == 100

    @gen_test
    async def test_all_faves_empty(self) -> None:
        response = await self.post_form("/api4/all_faves", self._auth_data())
        payload = self.payload(response)
        assert payload["all_faves"] == []

    @gen_test
    async def test_station_song_count(self) -> None:
        response = await self.post_form("/api4/station_song_count", self._auth_data())
        payload = self.payload(response)
        counts = payload["station_song_count"]
        assert any(row["sid"] == 1 and row["song_count"] == 2000 for row in counts)

    @gen_test
    async def test_user_requested_history_empty(self) -> None:
        response = await self.post_form(
            "/api4/user_requested_history",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert payload["user_requested_history"] == []

    @gen_test
    async def test_user_recent_votes_empty(self) -> None:
        response = await self.post_form("/api4/user_recent_votes", self._auth_data())
        payload = self.payload(response)
        assert payload["user_recent_votes"] == []
