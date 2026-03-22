import json
from typing import Any, Mapping, TypeAlias
from urllib.parse import urlencode

import tornado.web
from tornado.httpclient import HTTPRequest, HTTPResponse
from tornado.testing import AsyncHTTPTestCase

from api.handle_url import request_classes

FormValue: TypeAlias = str | int | float | bool
FormData: TypeAlias = Mapping[str, FormValue]
AuthData: TypeAlias = dict[str, FormValue]


class RequestClassesTestCase(AsyncHTTPTestCase):
    def app_settings(self) -> dict[str, Any]:
        return {}

    def get_app(self) -> tornado.web.Application:
        return tornado.web.Application(
            request_classes,
            debug=True,
            **self.app_settings(),
        )

    async def get_path(self, path: str, *, raise_error: bool = True) -> HTTPResponse:
        request = HTTPRequest(url=self.get_url(path), method="GET")
        return await self.http_client.fetch(request, raise_error=raise_error)

    async def post_form(
        self,
        path: str,
        data: FormData,
        *,
        raise_error: bool = True,
        headers: dict[str, str] | None = None,
    ) -> HTTPResponse:
        request_headers = {"Content-Type": "application/x-www-form-urlencoded"}
        if headers:
            request_headers.update(headers)

        request = HTTPRequest(
            url=self.get_url(path),
            method="POST",
            body=urlencode(data),
            headers=request_headers,
        )
        return await self.http_client.fetch(request, raise_error=raise_error)

    def payload(self, response: HTTPResponse) -> Any:
        return json.loads(response.body.decode("utf-8"))
