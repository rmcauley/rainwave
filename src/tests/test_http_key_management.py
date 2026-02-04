import tornado.web
from tornado.testing import AsyncHTTPTestCase

from src.web_api.urls import request_classes


class TestKeyManagement(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(request_classes, debug=True)

    def test_keys_requires_login(self):
        response = self.fetch("/keys/", method="GET", raise_error=False)
        assert response.code == 403

    def test_keys_create_requires_login(self):
        response = self.fetch("/keys/create", method="GET", raise_error=False)
        assert response.code == 403

    def test_keys_delete_requires_login(self):
        response = self.fetch(
            "/keys/delete?delete_key=1", method="GET", raise_error=False
        )
        assert response.code == 403
