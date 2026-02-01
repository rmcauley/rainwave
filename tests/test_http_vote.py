from __future__ import annotations

import datetime
import json
from urllib.parse import urlencode

import tornado.gen
import tornado.testing
import tornado.web
import tornado.websocket
from tornado.testing import AsyncHTTPTestCase

from api.urls import request_classes
import api_requests.sync
from libs import db, zeromq
from rainwave import schedule
import pytest
from tests.seed_data import (
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_LOGGED_IN_API_KEY,
    TUNED_OUT_LOGGED_IN_USER_ID,
)


class TestVote(AsyncHTTPTestCase):
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

    async def _post_async(self, path, data, raise_error=True):
        body = urlencode(data)
        response = await self.http_client.fetch(
            self.get_url(path),
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

    def _ensure_sync_initialized(self):
        if 1 in api_requests.sync.sessions:
            return
        zeromq.init_sub()
        api_requests.sync.init()

    def _ensure_tuned_in(self, user_id, sid=1):
        if (
            db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_listeners WHERE user_id = %s AND sid = %s",
                (user_id, sid),
            )
            > 0
        ):
            return
        db.c.update(
            "INSERT INTO r4_listeners (listener_ip, user_id, sid, listener_icecast_id) VALUES ('127.0.0.1', %s, %s, 1)",
            (user_id, sid),
        )

    async def _first_election_entry(self):
        response = await self._post_async("/api4/info", self._auth_data())
        payload = self._payload(response)
        for event in payload.get("sched_next") or []:
            songs = event.get("songs") or []
            if len(songs) < 2:
                continue
            entry_id = songs[0].get("entry_id")
            if entry_id:
                return event["id"], entry_id
        pytest.skip("No upcoming election with voteable entries.")

    async def _read_ws_json(self, ws, timeout_seconds=2):
        message = await tornado.gen.with_timeout(
            datetime.timedelta(seconds=timeout_seconds),
            ws.read_message(),
        )
        assert message is not None
        return json.loads(message)

    def test_vote_requires_tunein(self):
        response = self._post(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_OUT_LOGGED_IN_USER_ID,
                key=TUNED_OUT_LOGGED_IN_API_KEY,
                entry_id=1,
            ),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["vote_result"]["tl_key"] == "tunein_required"
