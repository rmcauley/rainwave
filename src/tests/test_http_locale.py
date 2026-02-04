import tornado.web
from tornado.testing import AsyncHTTPTestCase

from src.web_api.urls import request_classes


class TestLocale(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(
            request_classes, debug=True, template_path="templates"
        )

    def test_locale_index(self):
        response = self.fetch("/locale/", method="GET", raise_error=False)
        assert response.code == 200
        assert b"Locale/Translation Information" in response.body

    def test_locale_missing_lines_exists(self):
        response = self.fetch("/locale/en_CA", method="GET", raise_error=False)
        assert response.code == 200
        assert b"Missing Lines" in response.body

    def test_locale_missing_lines_unknown(self):
        response = self.fetch("/locale/zz_ZZ", method="GET", raise_error=False)
        assert response.code == 404
