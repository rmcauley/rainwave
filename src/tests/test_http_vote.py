import json
from urllib.parse import urlencode

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from web_api.urls import request_classes
import pytest
from tests.seed_data import (
    ANONYMOUS_API_KEY,
    ANONYMOUS_USER_ID,
    SITE_ADMIN_API_KEY,
    SITE_ADMIN_USER_ID,
    TUNED_IN_ANONYMOUS_IP,
    TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
    TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
    TUNED_IN_LOGGED_IN_API_KEY,
    TUNED_IN_LOGGED_IN_USER_ID,
    TUNED_OUT_LOGGED_IN_API_KEY,
    TUNED_OUT_LOGGED_IN_USER_ID,
)
from backend.libs import db


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

    def _payload(self, response):
        return json.loads(response.body.decode("utf-8"))

    def _auth_data(self, **extra):
        data = {"user_id": SITE_ADMIN_USER_ID, "key": SITE_ADMIN_API_KEY, "sid": 1}
        data.update(extra)
        return data

    def _anon_auth_data(self, **extra):
        return self._auth_data(
            user_id=ANONYMOUS_USER_ID, key=ANONYMOUS_API_KEY, **extra
        )

    def _first_election_entry(self):
        response = self._post("/api4/info", self._auth_data())
        payload = self._payload(response)
        for event in payload.get("sched_next") or []:
            songs = event.get("songs") or []
            if len(songs) > 1:
                entry_id = songs[0].get("entry_id")
                if entry_id:
                    return entry_id
        pytest.skip("No upcoming election with voteable entries.")

    def _set_anonymous_listener_purged(self, purged):
        db.c.update(
            "UPDATE r4_listeners SET listener_purge = %s WHERE user_id = %s AND listener_ip = %s",
            (purged, ANONYMOUS_USER_ID, TUNED_IN_ANONYMOUS_IP),
        )

    def test_vote_allows_tuned_in_anonymous(self):
        entry_id = self._first_election_entry()
        self._set_anonymous_listener_purged(False)
        response = self._post(
            "/api4/vote",
            self._anon_auth_data(entry_id=entry_id),
        )
        payload = self._payload(response)
        assert payload["vote_result"]["success"] is True

    def test_vote_rejects_tuned_out_anonymous(self):
        entry_id = self._first_election_entry()
        self._set_anonymous_listener_purged(True)
        try:
            response = self._post(
                "/api4/vote",
                self._anon_auth_data(entry_id=entry_id),
                raise_error=False,
            )
            assert response.code == 403
            payload = self._payload(response)
            assert payload["vote_result"]["tl_key"] == "tunein_required"
        finally:
            self._set_anonymous_listener_purged(False)

    def test_vote_allows_tuned_in_logged_in_user(self):
        entry_id = self._first_election_entry()
        response = self._post(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_IN_LOGGED_IN_USER_ID,
                key=TUNED_IN_LOGGED_IN_API_KEY,
                entry_id=entry_id,
            ),
        )
        payload = self._payload(response)
        assert payload["vote_result"]["success"] is True

    def test_vote_rejects_tuned_out_logged_in_user(self):
        entry_id = self._first_election_entry()
        response = self._post(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_OUT_LOGGED_IN_USER_ID,
                key=TUNED_OUT_LOGGED_IN_API_KEY,
                entry_id=entry_id,
            ),
            raise_error=False,
        )
        assert response.code == 403
        payload = self._payload(response)
        assert payload["vote_result"]["tl_key"] == "tunein_required"

    def test_vote_rejects_locked_user(self):
        entry_id = self._first_election_entry()
        response = self._post(
            "/api4/vote",
            self._auth_data(
                user_id=TUNED_IN_LOCKED_TO_OTHER_STATION_USER_ID,
                key=TUNED_IN_LOCKED_TO_OTHER_STATION_API_KEY,
                entry_id=entry_id,
            ),
            raise_error=False,
        )
        payload = self._payload(response)
        assert payload["vote_result"]["tl_key"] == "user_locked"
