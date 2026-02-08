import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID


class TestSearch(AsyncHTTPTestCase):
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
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
        data.update(extra)
        return data

    def test_search_too_short(self):
        response = self._post(
            "/api4/search", self._auth_data(search="so"), raise_error=False
        )
        payload = self._payload(response)
        assert payload["search_results"]["tl_key"] == "search_string_too_short"

    def test_search_finds_songs(self):
        response = self._post("/api4/search", self._auth_data(search="Song"))
        payload = self._payload(response)
        assert payload["songs"]
