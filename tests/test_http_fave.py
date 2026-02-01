from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestFave(AsyncHTTPTestCase):
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
        data = {"user_id": 2, "key": "TESTKEY", "sid": 1}
        data.update(extra)
        return data

    def _first_album_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        return self._payload(response)["all_albums"][0]["id"]

    def _first_song_id(self, album_id):
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

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
