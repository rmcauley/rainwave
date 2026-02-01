from __future__ import annotations

import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes


class TestRating(AsyncHTTPTestCase):
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
        return response

    def _payload(self, response):
        return json.loads(response.body.decode("utf-8"))

    def _auth_data(self, **extra):
        data = {"user_id": 2, "key": "TESTKEY", "sid": 1}
        data.update(extra)
        return data

    def _first_song_id(self):
        response = self._post("/api4/all_albums", self._auth_data())
        album_id = self._payload(response)["all_albums"][0]["id"]
        response = self._post("/api4/album", self._auth_data(id=album_id))
        return self._payload(response)["album"]["songs"][0]["id"]

    # def test_rate_requires_tunein(self):
    #     song_id = self._first_song_id()
    #     response = self._post(
    #         "/api4/rate",
    #         self._auth_data(song_id=song_id, rating=4.0),
    #         raise_error=False,
    #     )
    #     assert response.code == 403
    #     payload = self._payload(response)
    #     assert payload["rate_result"]["tl_key"] == "tunein_to_rate_current_song"
