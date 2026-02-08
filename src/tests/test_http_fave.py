import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
import pytest
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
)


class TestFave(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def _post(self, path, data, raise_error=True):
        body = urlencode(data)
        response = self.fetch(
            path,
            method="POST",
            body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            raise_error=raise_error,
        )
        if raise_error:
            assert response.code == 200
        return response

    def _payload(self, response):
        return json.loads(response.body.decode("utf-8"))

    def _auth_data(self, **extra):
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
        data.update(extra)
        return data

    def _anon_auth_data(self, **extra):
        return self._auth_data(
            user_id=ANONYMOUS_USER_ID, key=ANONYMOUS_API_KEY, **extra
        )

    def _first_album_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        return self._payload(response)["all_albums"][0]["id"]

    def _first_song_id(self, album_id):
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    def _info_payload(self):
        response = self._post("/api4/info", self._auth_data())
        return self._payload(response)

    def _find_event_with_songs(self, payload, min_count=1):
        current = payload.get("sched_current") or {}
        if current.get("songs") and len(current["songs"]) >= min_count:
            return current
        for event in payload.get("sched_next") or []:
            if event.get("songs") and len(event["songs"]) >= min_count:
                return event
        pytest.skip("No schedule event with enough songs to run fave tests.")

    def _find_song(self, payload, song_id):
        for event in [payload.get("sched_current")] + (payload.get("sched_next") or []):
            if not event or not event.get("songs"):
                continue
            for song in event["songs"]:
                if song.get("id") == song_id:
                    return song
        return None

    def test_info_song_fave_toggle(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song = event["songs"][0]
        song_id = song["id"]

        response = self._post(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="true"),
        )
        payload = self._payload(response)
        assert payload["fave_song_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song_id)
        assert song is not None
        assert song["fave"] is True

        response = self._post(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_song_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song_id)
        assert song is not None
        assert song["fave"] is False

    def test_info_song_fave_toggle_anonymous_fails(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song_id = event["songs"][0]["id"]

        response = self._post(
            "/api4/fave_song",
            self._anon_auth_data(song_id=song_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_song_result"]["tl_key"] == "login_required"

    def test_fave_song_toggle(self):
        album_id = self._first_album_id()
        song_id = self._first_song_id(album_id)

        response = self._post(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="true"),
        )
        payload = self._payload(response)
        assert payload["fave_song_result"]["success"] is True
        assert payload["fave_song_result"]["fave"] is True

        response = self._post(
            "/api4/fave_song",
            self._auth_data(song_id=song_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_song_result"]["success"] is True
        assert payload["fave_song_result"]["fave"] is False

    def test_fave_song_toggle_anonymous_fails(self):
        album_id = self._first_album_id()
        song_id = self._first_song_id(album_id)
        response = self._post(
            "/api4/fave_song",
            self._anon_auth_data(song_id=song_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_song_result"]["tl_key"] == "login_required"

    def test_fave_album_toggle(self):
        album_id = self._first_album_id()

        response = self._post(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self._payload(response)
        assert payload["fave_album_result"]["success"] is True
        assert payload["fave_album_result"]["fave"] is True

        response = self._post(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_album_result"]["success"] is True
        assert payload["fave_album_result"]["fave"] is False

    def test_fave_album_toggle_anonymous_fails(self):
        album_id = self._first_album_id()
        response = self._post(
            "/api4/fave_album",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_album_result"]["tl_key"] == "login_required"

    def test_info_album_fave_toggle(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        song = event["songs"][0]
        album = song["albums"][0]
        album_id = album["id"]

        response = self._post(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self._payload(response)
        assert payload["fave_album_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["albums"][0]["fave"] is True

        response = self._post(
            "/api4/fave_album",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_album_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["albums"][0]["fave"] is False

    def test_info_album_fave_toggle_anonymous_fails(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=1)
        album_id = event["songs"][0]["albums"][0]["id"]

        response = self._post(
            "/api4/fave_album",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_album_result"]["tl_key"] == "login_required"

    def test_fave_all_songs_unfave(self):
        album_id = self._first_album_id()
        response = self._post(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_all_songs_result"]["success"] is True
        assert payload["fave_all_songs_result"]["fave"] is False
        assert len(payload["fave_all_songs_result"]["song_ids"]) == 20

    def test_fave_all_songs_unfave_anonymous_fails(self):
        album_id = self._first_album_id()
        response = self._post(
            "/api4/fave_all_songs",
            self._anon_auth_data(album_id=album_id, fave="false"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_all_songs_result"]["tl_key"] == "login_required"

    def test_info_fave_all_songs_toggle(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=2)
        song = event["songs"][1]
        album = song["albums"][0]
        album_id = album["id"]

        response = self._post(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="true"),
        )
        payload = self._payload(response)
        assert payload["fave_all_songs_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["fave"] is True

        response = self._post(
            "/api4/fave_all_songs",
            self._auth_data(album_id=album_id, fave="false"),
        )
        payload = self._payload(response)
        assert payload["fave_all_songs_result"]["success"] is True

        payload = self._info_payload()
        song = self._find_song(payload, song["id"])
        assert song is not None
        assert song["fave"] is False

    def test_info_fave_all_songs_toggle_anonymous_fails(self):
        payload = self._info_payload()
        event = self._find_event_with_songs(payload, min_count=2)
        album_id = event["songs"][1]["albums"][0]["id"]

        response = self._post(
            "/api4/fave_all_songs",
            self._anon_auth_data(album_id=album_id, fave="true"),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["fave_all_songs_result"]["tl_key"] == "login_required"
