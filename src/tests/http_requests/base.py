import json
import os
from typing import Any, Mapping, TypeAlias
from urllib.parse import urlencode

from tornado.httpclient import AsyncHTTPClient, HTTPRequest, HTTPResponse
from tornado.testing import AsyncTestCase

FormValue: TypeAlias = str | int | float | bool
FormData: TypeAlias = Mapping[str, FormValue]
AuthData: TypeAlias = dict[str, FormValue]


class RequestClassesTestCase(AsyncTestCase):
    http_client: AsyncHTTPClient | None = None
    base_url = ""

    def app_settings(self) -> dict[str, Any]:
        return {}

    def setUp(self) -> None:
        super().setUp()
        self.http_client = AsyncHTTPClient()
        self.base_url = os.environ["RW_TEST_API_BASE_URL"]

    def get_url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    async def get_path(self, path: str, *, raise_error: bool = True) -> HTTPResponse:
        assert self.http_client is not None
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
        assert self.http_client is not None
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
