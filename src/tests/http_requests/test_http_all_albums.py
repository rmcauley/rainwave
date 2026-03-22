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

    @gen_test
    async def test_all_albums_returns_list(self) -> None:
        response = await self.post_form("/api4/all_albums", self._auth_data())
        payload = self.payload(response)
        assert "all_albums" in payload
        assert isinstance(payload["all_albums"], list)
        assert len(payload["all_albums"]) == 100

    @gen_test
    async def test_all_albums_returns_list_anonymous(self) -> None:
        response = await self.post_form("/api4/all_albums", self._anon_auth_data())
        payload = self.payload(response)
        assert "all_albums" in payload
        assert isinstance(payload["all_albums"], list)
        assert len(payload["all_albums"]) == 100

    @gen_test
    async def test_all_albums_sorted_by_name(self) -> None:
        response = await self.post_form("/api4/all_albums", self._auth_data())
        payload = self.payload(response)
        names = [album["name"] for album in payload["all_albums"]]
        assert names == sorted(names)

    @gen_test
    async def test_all_albums_schema_fields(self) -> None:
        response = await self.post_form("/api4/all_albums", self._auth_data())
        payload = self.payload(response)
        album = payload["all_albums"][0]
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
    async def test_all_albums_paginated(self) -> None:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_albums_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_albums_paginated_anonymous(self) -> None:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._anon_auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_albums_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_artists_returns_list(self) -> None:
        response = await self.post_form("/api4/all_artists", self._auth_data())
        payload = self.payload(response)
        assert "all_artists" in payload
        assert isinstance(payload["all_artists"], list)
        assert len(payload["all_artists"]) == 100
        assert {"id", "name", "song_count"}.issubset(payload["all_artists"][0].keys())

    @gen_test
    async def test_all_artists_returns_list_anonymous(self) -> None:
        response = await self.post_form("/api4/all_artists", self._anon_auth_data())
        payload = self.payload(response)
        assert "all_artists" in payload
        assert isinstance(payload["all_artists"], list)
        assert len(payload["all_artists"]) == 100
        assert {"id", "name", "song_count"}.issubset(payload["all_artists"][0].keys())

    @gen_test
    async def test_all_artists_paginated(self) -> None:
        response = await self.post_form(
            "/api4/all_artists_paginated",
            self._auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_artists_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_artists_paginated_anonymous(self) -> None:
        response = await self.post_form(
            "/api4/all_artists_paginated",
            self._anon_auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_artists_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_groups_returns_list(self) -> None:
        response = await self.post_form("/api4/all_groups", self._auth_data())
        payload = self.payload(response)
        assert "all_groups" in payload
        assert isinstance(payload["all_groups"], list)
        assert len(payload["all_groups"]) == 10
        assert {"id", "name"}.issubset(payload["all_groups"][0].keys())

    @gen_test
    async def test_all_groups_returns_list_anonymous(self) -> None:
        response = await self.post_form("/api4/all_groups", self._anon_auth_data())
        payload = self.payload(response)
        assert "all_groups" in payload
        assert isinstance(payload["all_groups"], list)
        assert len(payload["all_groups"]) == 10
        assert {"id", "name"}.issubset(payload["all_groups"][0].keys())

    @gen_test
    async def test_all_groups_paginated(self) -> None:
        response = await self.post_form(
            "/api4/all_groups_paginated",
            self._auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_groups_paginated"]
        assert len(result["data"]) == 10
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_all_groups_paginated_anonymous(self) -> None:
        response = await self.post_form(
            "/api4/all_groups_paginated",
            self._anon_auth_data(after=0),
        )
        payload = self.payload(response)
        result = payload["all_groups_paginated"]
        assert len(result["data"]) == 10
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    @gen_test
    async def test_artist_details(self) -> None:
        artists = self.payload(
            await self.post_form("/api4/all_artists", self._auth_data())
        )["all_artists"]
        artist_id = artists[0]["id"]
        response = await self.post_form("/api4/artist", self._auth_data(id=artist_id))
        payload = self.payload(response)
        assert payload["artist"]["id"] == artist_id
        assert "all_songs" in payload["artist"]

    @gen_test
    async def test_artist_details_anonymous(self) -> None:
        artists = self.payload(
            await self.post_form("/api4/all_artists", self._anon_auth_data())
        )["all_artists"]
        artist_id = artists[0]["id"]
        response = await self.post_form(
            "/api4/artist",
            self._anon_auth_data(id=artist_id),
        )
        payload = self.payload(response)
        assert payload["artist"]["id"] == artist_id
        assert "all_songs" in payload["artist"]

    @gen_test
    async def test_group_details(self) -> None:
        groups = self.payload(
            await self.post_form("/api4/all_groups", self._auth_data())
        )["all_groups"]
        group_id = groups[0]["id"]
        response = await self.post_form("/api4/group", self._auth_data(id=group_id))
        payload = self.payload(response)
        assert payload["group"]["id"] == group_id
        assert "all_songs_for_sid" in payload["group"]

    @gen_test
    async def test_group_details_anonymous(self) -> None:
        groups = self.payload(
            await self.post_form("/api4/all_groups", self._anon_auth_data())
        )["all_groups"]
        group_id = groups[0]["id"]
        response = await self.post_form(
            "/api4/group",
            self._anon_auth_data(id=group_id),
        )
        payload = self.payload(response)
        assert payload["group"]["id"] == group_id
        assert "all_songs_for_sid" in payload["group"]

    @gen_test
    async def test_album_details(self) -> None:
        albums = self.payload(
            await self.post_form("/api4/all_albums", self._auth_data())
        )["all_albums"]
        album_id = albums[0]["id"]
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        payload = self.payload(response)
        assert payload["album"]["id"] == album_id
        assert len(payload["album"]["songs"]) == 20

    @gen_test
    async def test_album_details_anonymous(self) -> None:
        albums = self.payload(
            await self.post_form("/api4/all_albums", self._anon_auth_data())
        )["all_albums"]
        album_id = albums[0]["id"]
        response = await self.post_form(
            "/api4/album",
            self._anon_auth_data(id=album_id),
        )
        payload = self.payload(response)
        assert payload["album"]["id"] == album_id
        assert len(payload["album"]["songs"]) == 20

    @gen_test
    async def test_song_details(self) -> None:
        albums = self.payload(
            await self.post_form("/api4/all_albums", self._auth_data())
        )["all_albums"]
        album_id = albums[0]["id"]
        album = self.payload(
            await self.post_form("/api4/album", self._auth_data(id=album_id))
        )["album"]
        song_id = album["songs"][0]["id"]
        response = await self.post_form("/api4/song", self._auth_data(id=song_id))
        payload = self.payload(response)
        song = payload["song"]
        assert song["id"] == song_id
        assert song["albums"]
        assert song["artists"]
        assert song["groups"]

    @gen_test
    async def test_song_details_anonymous(self) -> None:
        albums = self.payload(
            await self.post_form("/api4/all_albums", self._anon_auth_data())
        )["all_albums"]
        album_id = albums[0]["id"]
        album = self.payload(
            await self.post_form("/api4/album", self._anon_auth_data(id=album_id))
        )["album"]
        song_id = album["songs"][0]["id"]
        response = await self.post_form("/api4/song", self._anon_auth_data(id=song_id))
        payload = self.payload(response)
        song = payload["song"]
        assert song["id"] == song_id
        assert song["albums"]
        assert song["artists"]
        assert song["groups"]

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
    async def test_top_100_empty(self) -> None:
        response = await self.post_form("/api4/top_100", self._auth_data())
        payload = self.payload(response)
        assert payload["top_100"] == []

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
