from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestAllAlbums(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.code == 200
        return response

    def _payload(self, response):
        return json.loads(response.body.decode("utf-8"))

    def _auth_data(self, **extra):
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
        data.update(extra)
        return data

    def test_all_albums_returns_list(self):
        response = self._post(
            "/api4/all_albums",
            self._auth_data(),
        )
        payload = self._payload(response)
        assert "all_albums" in payload
        assert isinstance(payload["all_albums"], list)
        assert len(payload["all_albums"]) == 100

    def test_all_albums_sorted_by_name(self):
        response = self._post("/api4/all_albums", self._auth_data())
        payload = self._payload(response)
        names = [album["name"] for album in payload["all_albums"]]
        assert names == sorted(names)

    def test_all_albums_schema_fields(self):
        response = self._post("/api4/all_albums", self._auth_data())
        payload = self._payload(response)
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

    def test_all_albums_paginated(self):
        response = self._post("/api4/all_albums_paginated", self._auth_data(after=0))
        payload = self._payload(response)
        result = payload["all_albums_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    def test_all_artists_returns_list(self):
        response = self._post("/api4/all_artists", self._auth_data())
        payload = self._payload(response)
        assert "all_artists" in payload
        assert isinstance(payload["all_artists"], list)
        assert len(payload["all_artists"]) == 100
        assert {"id", "name", "song_count"}.issubset(payload["all_artists"][0].keys())

    def test_all_artists_paginated(self):
        response = self._post("/api4/all_artists_paginated", self._auth_data(after=0))
        payload = self._payload(response)
        result = payload["all_artists_paginated"]
        assert len(result["data"]) == 100
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    def test_all_groups_returns_list(self):
        response = self._post("/api4/all_groups", self._auth_data())
        payload = self._payload(response)
        assert "all_groups" in payload
        assert isinstance(payload["all_groups"], list)
        assert len(payload["all_groups"]) == 10
        assert {"id", "name"}.issubset(payload["all_groups"][0].keys())

    def test_all_groups_paginated(self):
        response = self._post("/api4/all_groups_paginated", self._auth_data(after=0))
        payload = self._payload(response)
        result = payload["all_groups_paginated"]
        assert len(result["data"]) == 10
        assert result["has_more"] is False
        assert result["progress"] == 100
        assert result["next"] == 1000

    def test_artist_details(self):
        artists = self._payload(self._post("/api4/all_artists", self._auth_data()))[
            "all_artists"
        ]
        artist_id = artists[0]["id"]
        response = self._post("/api4/artist", self._auth_data(id=artist_id))
        payload = self._payload(response)
        assert payload["artist"]["id"] == artist_id
        assert "all_songs" in payload["artist"]

    def test_group_details(self):
        groups = self._payload(self._post("/api4/all_groups", self._auth_data()))[
            "all_groups"
        ]
        group_id = groups[0]["id"]
        response = self._post("/api4/group", self._auth_data(id=group_id))
        payload = self._payload(response)
        assert payload["group"]["id"] == group_id
        assert "all_songs_for_sid" in payload["group"]

    def test_album_details(self):
        albums = self._payload(self._post("/api4/all_albums", self._auth_data()))[
            "all_albums"
        ]
        album_id = albums[0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        payload = self._payload(response)
        assert payload["album"]["id"] == album_id
        assert len(payload["album"]["songs"]) == 20

    def test_song_details(self):
        albums = self._payload(self._post("/api4/all_albums", self._auth_data()))[
            "all_albums"
        ]
        album_id = albums[0]["id"]
        album = self._payload(self._post("/api4/album", self._auth_data(id=album_id)))[
            "album"
        ]
        song_id = album["songs"][0]["id"]
        response = self._post("/api4/song", self._auth_data(id=song_id))
        payload = self._payload(response)
        song = payload["song"]
        assert song["id"] == song_id
        assert song["albums"]
        assert song["artists"]
        assert song["groups"]

    def test_all_songs_default_limit(self):
        response = self._post("/api4/all_songs", self._auth_data())
        payload = self._payload(response)
        assert len(payload["all_songs"]) == 100
        assert {"id", "title", "album_name", "rating", "rating_user", "fave"}.issubset(
            payload["all_songs"][0].keys()
        )

    def test_unrated_songs_default_limit(self):
        response = self._post("/api4/unrated_songs", self._auth_data())
        payload = self._payload(response)
        assert len(payload["unrated_songs"]) == 100

    def test_top_100_empty(self):
        response = self._post("/api4/top_100", self._auth_data())
        payload = self._payload(response)
        assert payload["top_100"] == []

    def test_all_faves_empty(self):
        response = self._post("/api4/all_faves", self._auth_data())
        payload = self._payload(response)
        assert payload["all_faves"] == []

    def test_station_song_count(self):
        response = self._post("/api4/station_song_count", self._auth_data())
        payload = self._payload(response)
        counts = payload["station_song_count"]
        assert any(row["sid"] == 1 and row["song_count"] == 2000 for row in counts)

    def test_user_requested_history_empty(self):
        response = self._post("/api4/user_requested_history", self._auth_data())
        payload = self._payload(response)
        assert payload["user_requested_history"] == []

    def test_user_recent_votes_empty(self):
        response = self._post("/api4/user_recent_votes", self._auth_data())
        payload = self._payload(response)
        assert payload["user_recent_votes"] == []
