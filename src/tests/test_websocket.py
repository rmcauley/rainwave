import asyncio
import json
import os
from typing import Any, Callable, cast

from tornado.httpclient import HTTPRequest, HTTPResponse
from tornado.testing import gen_test  # pyright: ignore[reportUnknownVariableType]
from tornado.websocket import WebSocketClientConnection, websocket_connect

from common import config
from common.zeromq import sync_to_front
from tests.db import get_test_cursor
from tests.http_requests.base import AuthData, FormValue, RequestClassesTestCase
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_IN_LOGGED_IN_USER_NAME,
)


class TestWebsocket(RequestClassesTestCase):
    def _auth_data(self, **extra: FormValue) -> AuthData:
        data: AuthData = {
            "user_id": SITE_ADMIN_USER_ID,
            "key": SITE_ADMIN_API_KEY,
            "sid": 1,
        }
        data.update(extra)
        return data

    def _websocket_url(self, sid: int = 1) -> str:
        api_base_url = os.getenv(
            "RW_TEST_API_BASE_URL", f"http://127.0.0.1:{config.api_base_port}"
        )
        websocket_base = api_base_url.replace("http://", "ws://", 1)
        return f"{websocket_base}/api4/websocket/{sid}"

    def _backend_url(self, sid: int = 1) -> str:
        backend_base_url = os.getenv(
            "RW_TEST_BACKEND_BASE_URL",
            f"http://127.0.0.1:{int(config.backend_port) + sid}",
        )
        return f"{backend_base_url}/advance/{sid}"

    async def _connect_websocket(self, sid: int = 1) -> WebSocketClientConnection:
        request = HTTPRequest(
            self._websocket_url(sid),
            headers={"Origin": "http://localhost"},
            request_timeout=5,
        )
        connection = await websocket_connect(request)
        assert connection is not None
        return connection

    async def _read_message(
        self, connection: WebSocketClientConnection, timeout: float = 5.0
    ) -> dict[str, Any]:
        raw_message = await asyncio.wait_for(connection.read_message(), timeout)
        assert raw_message is not None
        if isinstance(raw_message, bytes):
            return json.loads(raw_message.decode("utf-8"))
        return json.loads(raw_message)

    async def _wait_for_message(
        self,
        connection: WebSocketClientConnection,
        predicate: Callable[[dict[str, Any]], bool],
        *,
        timeout: float = 5.0,
    ) -> dict[str, Any]:
        deadline = asyncio.get_running_loop().time() + timeout
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                raise TimeoutError("Timed out waiting for websocket message.")
            message = await self._read_message(connection, timeout=remaining)
            if predicate(message):
                return message

    async def _auth_websocket(
        self, connection: WebSocketClientConnection, *, user_id: int, key: str
    ) -> None:
        connection.write_message(
            json.dumps({"action": "auth", "user_id": user_id, "key": key})
        )
        message = await self._wait_for_message(connection, lambda payload: "wsok" in payload)
        assert message["wsok"] is True

    async def _first_election_entry(self) -> int:
        response = await self.post_form(
            "/api4/info",
            self._auth_data(
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
            ),
        )
        payload = cast(dict[str, Any], self.payload(response))
        for event in cast(list[dict[str, Any]], payload.get("sched_next") or []):
            songs = cast(list[dict[str, Any]], event.get("songs") or [])
            if len(songs) > 1:
                entry_id = songs[0].get("entry_id")
                if entry_id:
                    return int(entry_id)
        raise AssertionError("No upcoming election with voteable entries.")

    async def _backend_advance_station(self, sid: int = 1) -> HTTPResponse:
        assert self.http_client is not None
        request = HTTPRequest(
            url=self._backend_url(sid),
            method="GET",
            request_timeout=10,
        )
        return await self.http_client.fetch(request)

    @gen_test(timeout=20)
    async def test_websocket_auth_and_user_refresh(self) -> None:
        connection = await self._connect_websocket()
        original_name = TUNED_IN_LOGGED_IN_USER_NAME
        try:
            await self._auth_websocket(
                connection,
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
            )

            new_name = "Websocket Test Name"
            async with get_test_cursor() as cursor:
                await cursor.update(
                    "UPDATE phpbb_users SET radio_username = %s WHERE user_id = %s",
                    (new_name, TUNED_IN_LOGGED_IN_USER_ID),
                )

            sync_to_front.sync_frontend_user_id(TUNED_IN_LOGGED_IN_USER_ID)

            message = await self._wait_for_message(
                connection, lambda payload: "user" in payload, timeout=5.0
            )
            assert message["user"]["name"] == new_name
        finally:
            async with get_test_cursor() as cursor:
                await cursor.update(
                    "UPDATE phpbb_users SET radio_username = %s WHERE user_id = %s",
                    (original_name, TUNED_IN_LOGGED_IN_USER_ID),
                )
            connection.close()

    @gen_test(timeout=20)
    async def test_websocket_receives_live_voting_update_after_http_vote(self) -> None:
        connection = await self._connect_websocket()
        try:
            await self._auth_websocket(
                connection,
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
            )

            entry_id = await self._first_election_entry()
            response = await self.post_form(
                "/api4/vote",
                self._auth_data(
                    user_id=TUNED_IN_LOGGED_IN_USER_ID,
                    key=TUNED_IN_LOGGED_IN_API_KEY,
                    entry_id=entry_id,
                ),
            )
            vote_payload = self.payload(response)
            assert vote_payload["vote_result"]["success"] is True

            live_voting_message = await self._wait_for_message(
                connection,
                lambda payload: "live_voting" in payload,
                timeout=5.0,
            )
            assert live_voting_message["live_voting"]
        finally:
            connection.close()

    @gen_test(timeout=20)
    async def test_websocket_receives_station_update_after_backend_advance(self) -> None:
        connection = await self._connect_websocket()
        try:
            await self._auth_websocket(
                connection,
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
            )

            info_response = await self.post_form("/api4/info", self._auth_data())
            info_payload = self.payload(info_response)
            current_title = info_payload["sched_current"]["songs"][0]["title"]

            backend_response = await self._backend_advance_station(1)
            assert backend_response.code == 200
            assert "annotate:crossfade" in backend_response.body.decode("utf-8")

            station_update = await self._wait_for_message(
                connection,
                lambda payload: "sched_current" in payload,
                timeout=10.0,
            )
            assert station_update["sched_current"]["songs"][0]["title"] != current_title
        finally:
            connection.close()
