import uuid

from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]

from common.db.build_insert import build_insert
from tests.db import get_test_cursor
from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestAdditionalContracts(RequestClassesTestCase):
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

    async def _first_album_id(self) -> int:
        response = await self.post_form(
            "/api4/all_albums_paginated",
            self._auth_data(after=0),
        )
        return int(self.payload(response)["all_albums_paginated"]["data"][0]["id"])

    async def _first_two_song_ids(self) -> tuple[int, int]:
        album_id = await self._first_album_id()
        response = await self.post_form("/api4/album", self._auth_data(id=album_id))
        songs = self.payload(response)["album"]["songs"]
        return int(songs[0]["id"]), int(songs[1]["id"])

    async def _session_cookie(self, user_id: int = SITE_ADMIN_USER_ID) -> str:
        session_id = str(uuid.uuid4())
        async with get_test_cursor() as cursor:
            await cursor.update(
                build_insert(
                    "r4_sessions", {"session_id": session_id, "user_id": user_id}
                ),
                {"session_id": session_id, "user_id": user_id},
            )
        return f"r4_session_id={session_id}"

    @gen_test
    async def test_bootstrap_post_and_get(self) -> None:
        post_response = await self.post_form("/api4/bootstrap", {"sid": 1})
        payload = self.payload(post_response)
        assert payload["build_version"] == 1000
        assert payload["stream_filename"] == "station"
        assert payload["station_list"]
        assert payload["relays"]

        get_response = await self.get_path("/api4/bootstrap?sid=1")
        body = get_response.body.decode("utf-8")
        assert body.startswith("var BOOTSTRAP=")
        assert "window.rainwaveInit" in body

    @gen_test
    async def test_auth_widget_and_tune_in_pages(self) -> None:
        response = await self.get_path("/oauth/login?destination=web")
        assert response.code == 200
        assert "destination" in response.body.decode("utf-8")

        response = await self.get_path(
            "/oauth/discord?destination=web",
            raise_error=False,
            follow_redirects=False,
        )
        assert response.code == 400

        response = await self.get_path(
            "/oauth/discord?id=1&state_argument=web$badstate&token=badtoken",
            raise_error=False,
        )
        assert response.code == 500

        response = await self.get_path("/oauth/debug")
        assert response.code == 200
        assert "User ID:" in response.body.decode("utf-8")

        response = await self.get_path(
            "/oauth/logout", raise_error=False, follow_redirects=False
        )
        assert response.code == 302
        assert response.headers["Location"] == "/"

        response = await self.get_path("/oauth/tos_privacy")
        assert response.code == 200
        assert "Privacy" in response.body.decode("utf-8")

        response = await self.get_path("/widget/")
        assert response.code == 200

        response = await self.get_path("/twitch/")
        assert response.code == 200

        response = await self.get_path("/widget/widget?sid=1")
        assert response.code == 200

        response = await self.get_path("/twitch/widget?sid=1")
        assert response.code == 200

        response = await self.get_path("/tune_in/1.mp3")
        tune_in_body = response.body.decode("utf-8")
        assert "#EXTINF:0,Rainwave Station:" in tune_in_body
        assert "station.mp3" in tune_in_body

        response = await self.get_path("/tune_in/station.mp3")
        assert response.code == 200

        response = await self.get_path("/tune_in/1.ogg.m3u")
        tune_in_ogg_body = response.body.decode("utf-8")
        assert "#EXTINF:0,Rainwave Station:" in tune_in_ogg_body
        assert "station.ogg" in tune_in_ogg_body

        response = await self.get_path("/tune_in/999.mp3", raise_error=False)
        assert response.code == 404

    @gen_test
    async def test_local_test_user_and_authenticated_key_pages(self) -> None:
        response = await self.get_path(
            "/test/create_user?registered=true&admin=false&perks=false"
        )
        assert response.code == 200
        assert "You are now user ID" in response.body.decode("utf-8")

        cookie = await self._session_cookie()

        response = await self.get_path(
            "/keys/",
            headers={"Cookie": cookie, "User-Agent": "Android"},
            raise_error=False,
            follow_redirects=False,
        )
        assert response.code == 302
        assert response.headers["Location"] == "/keys/app"

        response = await self.get_path(
            "/keys/?noredirect=1",
            headers={"Cookie": cookie, "User-Agent": "Android"},
        )
        body = response.body.decode("utf-8")
        assert response.code == 200
        assert SITE_ADMIN_API_KEY in body

        response = await self.get_path("/keys/app", headers={"Cookie": cookie})
        body = response.body.decode("utf-8")
        assert response.code == 200
        assert f"rw://{SITE_ADMIN_USER_ID}:{SITE_ADMIN_API_KEY}@rainwave.cc" in body

        async with get_test_cursor() as cursor:
            before_count = await cursor.fetch_var(
                "SELECT COUNT(*) FROM r4_api_keys WHERE user_id = %s",
                (SITE_ADMIN_USER_ID,),
                var_type=int,
            )

        response = await self.get_path("/keys/create", headers={"Cookie": cookie})
        assert response.code == 200

        async with get_test_cursor() as cursor:
            created_key_id = await cursor.fetch_var(
                "SELECT MAX(api_id) FROM r4_api_keys WHERE user_id = %s",
                (SITE_ADMIN_USER_ID,),
                var_type=int,
            )
            after_create_count = await cursor.fetch_var(
                "SELECT COUNT(*) FROM r4_api_keys WHERE user_id = %s",
                (SITE_ADMIN_USER_ID,),
                var_type=int,
            )
        assert before_count is not None
        assert after_create_count == before_count + 1
        assert created_key_id is not None

        response = await self.get_path(
            f"/keys/delete?delete_key={created_key_id}",
            headers={"Cookie": cookie},
        )
        assert response.code == 200

        async with get_test_cursor() as cursor:
            after_delete_count = await cursor.fetch_var(
                "SELECT COUNT(*) FROM r4_api_keys WHERE user_id = %s",
                (SITE_ADMIN_USER_ID,),
                var_type=int,
            )
        assert after_delete_count == before_count

    @gen_test
    async def test_request_and_order_requests(self) -> None:
        song_id_1, song_id_2 = await self._first_two_song_ids()

        response = await self.post_form(
            "/api4/request",
            self._auth_data(song_id=song_id_1),
        )
        payload = self.payload(response)
        assert payload["request_result"]["success"] is True
        assert len(payload["requests"]) == 1

        response = await self.post_form(
            "/api4/request",
            self._auth_data(song_id=song_id_2),
        )
        payload = self.payload(response)
        assert payload["request_result"]["success"] is True
        assert len(payload["requests"]) == 2

        response = await self.post_form(
            "/api4/order_requests",
            self._auth_data(order=f"{song_id_2},{song_id_1}"),
        )
        payload = self.payload(response)
        assert payload["order_requests_result"]["success"] is True

        async with get_test_cursor() as cursor:
            first_order_song_id = await cursor.fetch_var(
                """
                SELECT song_id
                FROM r4_request_store
                WHERE user_id = %s
                ORDER BY reqstor_order ASC
                LIMIT 1
                """,
                (SITE_ADMIN_USER_ID,),
                var_type=int,
            )
        assert first_order_song_id == song_id_2

    @gen_test(timeout=20)
    async def test_request_unrated_rate_clear_rating_and_history(self) -> None:
        song_id_1, _song_id_2 = await self._first_two_song_ids()

        response = await self.post_form(
            "/api4/request_unrated_songs",
            self._auth_data(),
        )
        payload = self.payload(response)
        assert payload["request_unrated_songs_result"]["success"] is True
        assert payload["requests"]

        response = await self.post_form(
            "/api4/rate",
            self._auth_data(song_id=song_id_1, rating=4),
        )
        assert self.payload(response)["rate_result"]["success"] is True

        response = await self.post_form(
            "/api4/clear_rating",
            self._auth_data(song_id=song_id_1),
        )
        payload = self.payload(response)
        assert payload["rate_result"]["success"] is True
        assert payload["rate_result"]["rating_user"] is None

        response = await self.post_form("/api4/playback_history", self._auth_data())
        payload = self.payload(response)
        assert payload["playback_history"]

    @gen_test(timeout=20)
    async def test_pages_render(self) -> None:
        public_page_paths = [
            "/pages/playback_history?sid=1",
            "/pages/request_line?sid=1",
            "/pages/top_100?sid=1",
            "/pages/tip_jar?sid=1",
        ]
        authenticated_page_paths = [
            "/pages/user_requested_history?sid=1",
            "/pages/all_faves?sid=1",
            "/pages/unrated_songs?sid=1",
            "/pages/user_recent_votes?sid=1",
        ]

        for path in public_page_paths:
            try:
                response = await self.get_path(path, request_timeout=3)
            except Exception as exc:
                raise AssertionError(f"page route failed: {path}") from exc
            assert response.code == 200

        cookie = await self._session_cookie()
        for path in authenticated_page_paths:
            try:
                response = await self.get_path(
                    path,
                    request_timeout=3,
                    headers={"Cookie": cookie},
                )
            except Exception as exc:
                raise AssertionError(f"page route failed: {path}") from exc
            assert response.code == 200

    @gen_test
    async def test_request_related_routes_require_login_for_anonymous(self) -> None:
        song_id_1, _song_id_2 = await self._first_two_song_ids()

        response = await self.post_form(
            "/api4/request",
            self._anon_auth_data(song_id=song_id_1),
            raise_error=False,
        )
        assert response.code == 403
        assert self.payload(response)["error"]["tl_key"] == "login_required"

        response = await self.post_form(
            "/api4/order_requests",
            self._anon_auth_data(order=f"{song_id_1}"),
            raise_error=False,
        )
        assert response.code == 403

        response = await self.post_form(
            "/api4/request_unrated_songs",
            self._anon_auth_data(),
            raise_error=False,
        )
        assert response.code == 403

        response = await self.post_form(
            "/api4/clear_rating",
            self._anon_auth_data(song_id=song_id_1),
            raise_error=False,
        )
        assert response.code == 403
