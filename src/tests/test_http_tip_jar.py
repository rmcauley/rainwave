import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from tests.seed_data import SITE_ADMIN_API_KEY, SITE_ADMIN_USER_ID

from api.urls import request_classes


class TestTipJar(AsyncHTTPTestCase):
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
        return response

    def test_tip_jar_empty(self):
        response = self._post(
            "/api4/admin/add_donation",
            {
                "user_id": SITE_ADMIN_USER_ID,
                "key": SITE_ADMIN_API_KEY,
                "sid": 1,
                "donor_id": SITE_ADMIN_USER_ID,
                "amount": 5,
                "message": "Thanks",
                "private": "false",
            },
        )
        payload = json.loads(response.body.decode("utf-8"))
        assert payload["add_donation_result"]["tl_key"] == "donation_added"

        response = self._post("/api4/tip_jar", {})
        payload = json.loads(response.body.decode("utf-8"))
        assert len(payload["tip_jar"]) == 1
        assert payload["tip_jar"][0]["message"] == "Thanks"
