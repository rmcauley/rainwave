from typing import Any, cast

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.db import get_test_cursor
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    SITE_ADMIN_USER_NAME,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
)


class TestAdminCore(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    async def _first_song_id(self) -> int:
        album_id = await self._first_album_id()
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        return int(self.payload(response)["album"]["songs"][0]["id"])

    async def _first_album_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        return int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])

    @gen_test
    async def test_admin_albums(self) -> None:
        response = await self.post_form(
            "/api4/admin/albums",
            self._auth_data(sid=1),
        )
        payload = self.payload(response)
        albums = cast(list[dict[str, Any]], payload["admin_albums"])
        assert isinstance(albums, list)
        assert len(albums) > 0

        first_album = albums[0]
        assert set(first_album.keys()) == {
            "album_id",
            "album_name",
            "rating",
            "rating_count",
            "album_cool_multiply",
            "album_cool_override",
        }

    @gen_test
    async def test_admin_album_songs(self) -> None:
        album_id = await self._first_album_id()
        song_id = await self._first_song_id()
        async with get_test_cursor() as cursor:
            await cursor.update(
                """
                UPDATE r4_songs
                SET song_rating = %s, song_rating_count = %s, song_cool_multiply = %s, song_cool_override = %s
                WHERE song_id = %s
                """,
                (4.3, 27, 1.7, 999, song_id),
            )
            await cursor.update(
                """
                UPDATE r4_song_sid
                SET song_request_only = TRUE, song_request_only_end = NULL
                WHERE song_id = %s AND sid = %s
                """,
                (song_id, 1),
            )

        response = await self.post_form(
            "/api4/admin/album_songs",
            self._auth_data(sid=1, album_id=album_id),
        )
        payload = self.payload(response)
        songs = cast(list[dict[str, Any]], payload["admin_album_songs"])
        assert isinstance(songs, list)
        assert len(songs) > 0

        matching_song = next(song for song in songs if int(song["song_id"]) == song_id)
        assert set(matching_song.keys()) == {
            "song_id",
            "song_filename",
            "rating",
            "rating_count",
            "song_cool_multiply",
            "song_cool_override",
            "song_request_only",
        }
        assert matching_song["rating"] == 4.3
        assert matching_song["rating_count"] == 27
        assert matching_song["song_cool_multiply"] == 1.7
        assert matching_song["song_cool_override"] == 999
        assert matching_song["song_request_only"] is True

    @gen_test
    async def test_admin_album_art(self) -> None:
        album_id = await self._first_album_id()
        async with get_test_cursor() as cursor:
            await cursor.update(
                """
                INSERT INTO r4_album_sid (album_id, sid, album_song_count, album_art_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (album_id, sid)
                DO UPDATE SET album_art_url = EXCLUDED.album_art_url
                """,
                (album_id, 2, 0, "art_station_2"),
            )
            await cursor.update(
                """
                UPDATE r4_album_sid
                SET album_art_url = %s
                WHERE album_id = %s AND sid = %s
                """,
                ("art_station_1", album_id, 1),
            )

        response = await self.post_form(
            "/api4/admin/album_art",
            self._auth_data(album_id=album_id),
        )
        payload = self.payload(response)
        album_art = cast(list[dict[str, Any]], payload["admin_album_art"])
        assert isinstance(album_art, list)
        assert {"sid": 1, "album_art": "art_station_1"} in album_art
        assert {"sid": 2, "album_art": "art_station_2"} in album_art

    @gen_test
    async def test_set_song_request_only(self) -> None:
        song_id = await self._first_song_id()
        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="true"),
        )
        payload = self.payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            self._auth_data(song_id=song_id, request_only="false"),
        )
        payload = self.payload(response)
        assert payload["set_song_request_only_result"]["success"] is True

    @gen_test
    async def test_user_search(self) -> None:
        response = await self.post_form(
            "/api4/user_search",
            {"username": SITE_ADMIN_USER_NAME},
        )
        payload = self.payload(response)
        assert payload["admin_user_search_result"]["user_id"] == SITE_ADMIN_USER_ID

    @gen_test
    async def test_user_search_by_discord_user_id(self) -> None:
        response = await self.post_form(
            "/api4/user_search_by_discord_user_id",
            {"discord_user_id": "missing"},
        )
        payload = self.payload(response)
        assert payload["admin_user_search_result"]["user_id"] is None

    @gen_test
    async def test_update_user_avatar_by_discord_id(self) -> None:
        response = await self.post_form(
            "/api4/update_user_avatar_by_discord_id",
            {"discord_user_id": "missing", "avatar": "http://example.com/a.png"},
        )
        payload = self.payload(response)
        assert payload["update_user_avatar_by_discord_id_result"]["tl_key"] == "yes"

    @gen_test
    async def test_update_user_nickname_by_discord_id(self) -> None:
        response = await self.post_form(
            "/api4/update_user_nickname_by_discord_id",
            {"discord_user_id": "missing", "nickname": "NewNick"},
        )
        payload = self.payload(response)
        assert payload["update_user_nickname_by_discord_id_result"]["tl_key"] == "yes"

    @gen_test
    async def test_enable_perks_by_discord_ids(self) -> None:
        response = await self.post_form(
            "/api4/enable_perks_by_discord_ids",
            {"discord_user_ids": "a,b"},
        )
        payload = self.payload(response)
        assert payload["enable_perks_by_discord_ids_result"]["tl_key"] == "yes"

    @gen_test
    async def test_admin_backend_scan_errors(self) -> None:
        response = await self.post_form(
            "/api4/admin/music_scan_errors",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert "admin_music_scan_errors" in payload or "js_errors" in payload

    @gen_test
    async def test_admin_js_errors(self) -> None:
        response = await self.post_form(
            "/api4/admin/js_errors",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert "admin_js_errors" in payload
        assert isinstance(payload["admin_js_errors"], list)

    @gen_test
    async def test_admin_commands_require_admin_user(self) -> None:
        song_id = await self._first_song_id()
        auth_data = self._auth_data(
            user_id=TUNED_IN_LOGGED_IN_USER_ID,
            key=TUNED_IN_LOGGED_IN_API_KEY,
        )

        response = await self.post_form(
            "/api4/admin/set_song_request_only",
            {**auth_data, "song_id": song_id, "request_only": "true"},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/music_scan_errors",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/js_errors",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"

        album_id = await self._first_album_id()
        response = await self.post_form(
            "/api4/admin/albums",
            auth_data,
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/album_songs",
            {**auth_data, "sid": 1, "album_id": album_id},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"

        response = await self.post_form(
            "/api4/admin/album_art",
            {**auth_data, "album_id": album_id},
            raise_error=False,
        )
        assert response.code == 403
        payload = self.payload(response)
        assert payload["error"]["tl_key"] == "admin_required"
