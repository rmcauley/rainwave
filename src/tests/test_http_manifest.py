import json

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from web_api.urls import request_classes


class TestManifest(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def test_manifest_with_sid(self):
        response = self.fetch("/manifest.json?sid=1", method="GET", raise_error=False)
        assert response.code == 200
        assert (
            response.headers.get("Content-Type")
            == "application/x-web-app-manifest+json"
        )
        payload = json.loads(response.body.decode("utf-8"))
        assert payload["name"].startswith("Rainwave")
        assert payload["short_name"]
