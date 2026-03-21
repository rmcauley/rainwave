import datetime
from time import time as timestamp
from typing import Any

import tornado

from api.routes.websocket.websocket_tracker.websocket_tracker import websockets_by_sid
from common.user.model.user_base import UserBase


VoteThrottleKey = int | str


class VoteThrottleService:
    """Owns the vote-broadcast throttle policy and its shared in-memory state.

    This service does not validate votes. It only decides whether live voting
    websocket updates should be broadcast immediately or delayed when the same
    voter is acting repeatedly in a short window.

    The throttle identity is intentionally cross-station:
    - logged-in users are keyed by user id
    - anonymous users are keyed by remote IP
    """

    def __init__(
        self,
        vote_limit: int = 3,
        vote_once_every_seconds: int = 5,
    ) -> None:
        super().__init__()
        self.vote_limit = vote_limit
        self.vote_once_every_seconds = vote_once_every_seconds
        self._votes_by_key: dict[VoteThrottleKey, int] = {}
        self._last_vote_by_key: dict[VoteThrottleKey, float] = {}
        self._delayed_live_vote_by_sid: dict[int, dict[str, Any] | None] = {
            sid: None for sid in websockets_by_sid
        }
        self._delayed_live_vote_timer_by_sid: dict[int, object | None] = {
            sid: None for sid in websockets_by_sid
        }

    def build_key(self, user: UserBase, remote_ip: str) -> VoteThrottleKey:
        """Return the shared throttle identity for a websocket client."""
        return remote_ip if user.is_anonymous() else user.id

    def record_vote(self, by_key: VoteThrottleKey, now: float | None = None) -> None:
        """Record that this throttle identity submitted another vote."""
        current_time = now if now is not None else timestamp()
        self._votes_by_key[by_key] = self._votes_by_key.get(by_key, 0) + 1
        self._last_vote_by_key[by_key] = current_time

    def seconds_until_live_broadcast_allowed(
        self, by_key: VoteThrottleKey, now: float | None = None
    ) -> float:
        """Return remaining delay before this identity can broadcast live again."""
        if by_key not in self._votes_by_key:
            return 0

        current_time = now if now is not None else timestamp()
        last_vote_time = self._last_vote_by_key[by_key]
        if self._votes_by_key[by_key] < self.vote_limit:
            return 0
        if current_time >= last_vote_time + self.vote_once_every_seconds:
            return 0
        return (last_vote_time + self.vote_once_every_seconds) - current_time

    def should_delay_live_broadcast(
        self, by_key: VoteThrottleKey, now: float | None = None
    ) -> bool:
        return self.seconds_until_live_broadcast_allowed(by_key, now) > 0

    def reset_vote_counters(self) -> None:
        """Clear short-lived counters after a schedule-wide refresh."""
        self._votes_by_key = {}
        self._last_vote_by_key = {}

    def handle_live_voting_message(self, message: dict[str, Any]) -> None:
        """Broadcast a live-voting payload now and clear any delayed replacement."""
        sid = message["sid"]
        websockets_by_sid[sid].send_to_all(message["uuid_exclusion"], message["data"])
        self.clear_delayed_live_vote(sid)

    def handle_delayed_live_voting_message(self, message: dict[str, Any]) -> None:
        """Store the latest delayed payload and schedule a flush if needed."""
        sid = message["sid"]
        if not self._delayed_live_vote_timer_by_sid[sid]:
            self._schedule_delayed_live_vote(sid)
        self._delayed_live_vote_by_sid[sid] = message

    def clear_delayed_live_vote(self, sid: int) -> None:
        """Cancel any delayed broadcast currently queued for this station."""
        timer = self._delayed_live_vote_timer_by_sid[sid]
        if timer:
            tornado.ioloop.IOLoop.instance().remove_timeout(timer)
        self._delayed_live_vote_by_sid[sid] = None
        self._delayed_live_vote_timer_by_sid[sid] = None

    def _schedule_delayed_live_vote(self, sid: int) -> None:
        self._delayed_live_vote_timer_by_sid[
            sid
        ] = tornado.ioloop.IOLoop.instance().add_timeout(
            datetime.timedelta(seconds=self.vote_once_every_seconds),
            lambda: self.flush_delayed_live_vote(sid),
        )

    def flush_delayed_live_vote(self, sid: int) -> None:
        """Broadcast the latest delayed live-voting payload for this station."""
        self._delayed_live_vote_timer_by_sid[sid] = None
        delayed_vote = self._delayed_live_vote_by_sid[sid]
        if not delayed_vote:
            return
        websockets_by_sid[sid].send_to_all(None, delayed_vote["data"])
        self._delayed_live_vote_by_sid[sid] = None
